"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { proximasSessoes } from "@/lib/sessoes";

export type GrupoActionState = { error?: string } | undefined;

function grupoFromForm(formData: FormData) {
  const frequencia = String(formData.get("frequencia") ?? "sem_frequencia");
  const recorrente = frequencia !== "sem_frequencia";
  const diaSemana = String(formData.get("dia_semana") ?? "");
  const horario = String(formData.get("horario") ?? "");
  const valorDiaria = String(formData.get("valor_diaria") ?? "");
  const valorMensalidade = String(formData.get("valor_mensalidade") ?? "");

  return {
    nome: String(formData.get("nome") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? "futebol"),
    local: String(formData.get("local") ?? "").trim() || null,
    frequencia,
    dia_semana: recorrente && diaSemana !== "" ? Number(diaSemana) : null,
    horario: recorrente && horario ? horario : null,
    valor_diaria: valorDiaria ? Number(valorDiaria) : null,
    valor_mensalidade: valorMensalidade ? Number(valorMensalidade) : null,
  };
}

export async function criarGrupo(
  locale: string,
  _prevState: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const grupo = grupoFromForm(formData);
  if (!grupo.nome) return { error: "Informe o nome do grupo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // id gerado aqui em vez de RETURNING: a policy de select roda dentro do
  // próprio INSERT e is_membro_grupo (stable) ainda não enxerga a linha nova.
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("grupos_pelada")
    .insert({ ...grupo, id, organizador_id: user.id });

  if (error) return { error: error.message };

  // Grupo recorrente já nasce com as próximas 4 sessões agendadas.
  // (Sem notificação aqui: o grupo acabou de ser criado, ainda não tem membros.)
  if (grupo.frequencia !== "sem_frequencia" && grupo.dia_semana != null && grupo.horario) {
    await supabase.from("sessoes_pelada").insert(
      proximasSessoes(
        grupo.dia_semana,
        grupo.horario,
        grupo.frequencia as "semanal" | "quinzenal",
      ).map((data) => ({
        grupo_id: id,
        data_hora: data.toISOString(),
        local: grupo.local,
      })),
    );
  }

  redirect(`/${locale}/grupos/${id}`);
}

export async function editarGrupo(
  locale: string,
  grupoId: string,
  _prevState: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const grupo = grupoFromForm(formData);
  if (!grupo.nome) return { error: "Informe o nome do grupo." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("grupos_pelada")
    .update(grupo)
    .eq("id", grupoId);

  if (error) return { error: error.message };
  redirect(`/${locale}/grupos/${grupoId}`);
}

export async function excluirGrupo(locale: string, grupoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("grupos_pelada").delete().eq("id", grupoId);
  if (!error) redirect(`/${locale}/grupos`);
}

export async function entrarNoGrupo(
  locale: string,
  codigo: string,
  _prevState: GrupoActionState,
  formData: FormData,
): Promise<GrupoActionState> {
  const tipoPagamento = String(formData.get("tipo_pagamento") ?? "diarista");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/convite/${codigo}`);

  const { data: grupos, error: lookupError } = await supabase.rpc(
    "grupo_por_codigo",
    { p_codigo: codigo },
  );
  if (lookupError) return { error: lookupError.message };
  const grupo = grupos?.[0];
  if (!grupo) return { error: "Convite inválido ou expirado." };

  if (!grupo.ja_membro) {
    const { error } = await supabase.from("membros_grupo").insert({
      grupo_id: grupo.id,
      usuario_id: user.id,
      tipo_pagamento: tipoPagamento,
    });
    if (error) return { error: error.message };
  }
  redirect(`/${locale}/grupos/${grupo.id}`);
}

export async function removerMembro(grupoId: string, usuarioId: string) {
  const supabase = await createClient();
  await supabase
    .from("membros_grupo")
    .delete()
    .eq("grupo_id", grupoId)
    .eq("usuario_id", usuarioId);
  revalidatePath("/", "layout");
}
