"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type SessaoActionState = { error?: string } | undefined;

// Status que o próprio usuário pode escolher — confirmado_pendente_pagamento
// é setado pelo sistema no milestone de pagamento, nunca pelo RSVP.
const STATUS_RSVP = ["fora", "duvida", "confirmado"] as const;

export async function marcarPresenca(sessaoId: string, formData: FormData) {
  const status = String(formData.get("status"));
  if (!STATUS_RSVP.includes(status as (typeof STATUS_RSVP)[number])) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

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
  if (!data || !horario) return { error: "Informe data e horário." };

  const supabase = await createClient();
  const t = await getTranslations({ locale, namespace: "Sessoes" });

  const { data: grupo } = await supabase
    .from("grupos_pelada")
    .select("nome")
    .eq("id", grupoId)
    .single();
  if (!grupo) return { error: "Grupo não encontrado." };

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
    // fica pro milestone de push real
    await supabase.from("notificacoes").insert(
      membros.map((m) => ({
        usuario_id: m.usuario_id,
        grupo_id: grupoId,
        titulo: t("notificacaoNovaSessao", { grupo: grupo.nome }),
        link: `/sessoes/${id}`,
      })),
    );
  }

  redirect(`/${locale}/sessoes/${id}`);
}

export async function marcarNotificacaoLida(id: string) {
  const supabase = await createClient();
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
}
