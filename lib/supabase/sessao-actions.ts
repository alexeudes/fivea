"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";

export type SessaoActionState = { error?: string } | undefined;

// Status que o próprio usuário pode escolher — confirmado_pendente_pagamento
// é setado pelo sistema no milestone de pagamento, nunca pelo RSVP.
const STATUS_RSVP = ["fora", "duvida", "confirmado"] as const;

export async function marcarPresenca(sessaoId: string, formData: FormData) {
  let status = String(formData.get("status"));
  if (!STATUS_RSVP.includes(status as (typeof STATUS_RSVP)[number])) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Diarista confirmando num grupo com diária cobrada entra como
  // "confirmado_pendente_pagamento" — o webhook do AbacatePay destrava
  // pra "confirmado" quando o Pix é pago. Quem já pagou esta sessão
  // confirma direto.
  if (status === "confirmado") {
    const { data: sessao } = await supabase
      .from("sessoes_pelada")
      .select("grupo_id, grupo:grupos_pelada(valor_diaria)")
      .eq("id", sessaoId)
      .returns<{ grupo_id: string; grupo: { valor_diaria: number | null } }[]>()
      .single();
    const { data: membro } = sessao
      ? await supabase
          .from("membros_grupo")
          .select("tipo_pagamento")
          .eq("grupo_id", sessao.grupo_id)
          .eq("usuario_id", user.id)
          .maybeSingle()
      : { data: null };

    if (membro?.tipo_pagamento === "diarista" && Number(sessao?.grupo.valor_diaria) > 0) {
      const { data: pago } = await supabase
        .from("pagamentos")
        .select("id")
        .eq("sessao_id", sessaoId)
        .eq("usuario_id", user.id)
        .eq("status", "pago")
        .limit(1)
        .maybeSingle();
      if (!pago) status = "confirmado_pendente_pagamento";
    }
  }

  await supabase.from("presencas").upsert(
    {
      sessao_id: sessaoId,
      usuario_id: user.id,
      status,
      confirmado_em: status === "confirmado" ? new Date().toISOString() : null,
    },
    { onConflict: "sessao_id,usuario_id" },
  );
  revalidatePath("/", "layout");
}

export async function criarSessao(
  locale: string,
  grupoId: string,
  _prevState: SessaoActionState,
  formData: FormData,
): Promise<SessaoActionState> {
  const data = String(formData.get("data") ?? "");
  const horario = String(formData.get("horario") ?? "");
  const local = String(formData.get("local") ?? "").trim() || null;
  const tErros = await getTranslations({ locale, namespace: "Erros" });
  if (!data || !horario) return { error: tErros("informeDataHorario") };

  const supabase = await createClient();
  const t = await getTranslations({ locale, namespace: "Sessoes" });

  const { data: grupo } = await supabase
    .from("grupos_pelada")
    .select("nome")
    .eq("id", grupoId)
    .single();
  if (!grupo) return { error: tErros("grupoNaoEncontrado") };

  // id gerado no app (sem RETURNING) — ver gotcha de RLS no CLAUDE.md
  const id = crypto.randomUUID();
  const { error } = await supabase.from("sessoes_pelada").insert({
    id,
    grupo_id: grupoId,
    data_hora: new Date(`${data}T${horario}`).toISOString(),
    local,
  });
  if (error) return { error: error.message };

  // notifica os membros (o organizador que criou não precisa)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: membros } = await supabase
    .from("membros_grupo")
    .select("usuario_id")
    .eq("grupo_id", grupoId)
    .eq("ativo", true)
    .neq("usuario_id", user!.id);

  if (membros?.length) {
    // ponytail: título renderizado no locale do organizador; por-destinatário
    // exigiria guardar locale preferido no perfil
    const titulo = t("notificacaoNovaSessao", { grupo: grupo.nome });
    await supabase.from("notificacoes").insert(
      membros.map((m) => ({
        usuario_id: m.usuario_id,
        grupo_id: grupoId,
        titulo,
        link: `/sessoes/${id}`,
      })),
    );

    // web push (melhor-esforço): subscriptions dos membros via service_role
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in(
        "usuario_id",
        membros.map((m) => m.usuario_id),
      );
    if (subs?.length) {
      const mortos = await enviarPush(subs, {
        title: titulo,
        link: `/${locale}/sessoes/${id}`,
      });
      if (mortos.length)
        await admin.from("push_subscriptions").delete().in("endpoint", mortos);
    }
  }

  redirect(`/${locale}/sessoes/${id}`);
}

export async function marcarRealizada(sessaoId: string) {
  const supabase = await createClient();
  // a policy sessoes_update_organizador garante que só o organizador consegue
  await supabase
    .from("sessoes_pelada")
    .update({ status: "realizada" })
    .eq("id", sessaoId)
    .eq("status", "agendada");
  revalidatePath("/", "layout");
}

const CONFIRMADOS = ["confirmado", "confirmado_pendente_pagamento"];

export async function avaliarJogador(
  sessaoId: string,
  avaliadoId: string,
  formData: FormData,
) {
  const nota = Number(formData.get("nota"));
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || avaliadoId === user.id) return;

  // só depois da pelada, e só entre quem estava confirmado — membership do
  // grupo, avaliador = auth.uid() e não-autoavaliação já são RLS/constraint
  const { data: sessao } = await supabase
    .from("sessoes_pelada")
    .select("status")
    .eq("id", sessaoId)
    .single();
  if (sessao?.status !== "realizada") return;

  const { data: presencas } = await supabase
    .from("presencas")
    .select("usuario_id")
    .eq("sessao_id", sessaoId)
    .in("status", CONFIRMADOS)
    .in("usuario_id", [user.id, avaliadoId]);
  if (presencas?.length !== 2) return;

  await supabase.from("avaliacoes").upsert(
    { sessao_id: sessaoId, avaliado_id: avaliadoId, avaliador_id: user.id, nota },
    { onConflict: "sessao_id,avaliado_id,avaliador_id" },
  );
  revalidatePath("/", "layout");
}

export async function marcarNotificacaoLida(id: string) {
  const supabase = await createClient();
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
}
