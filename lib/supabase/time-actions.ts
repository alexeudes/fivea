"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sortearTimes as balancear } from "@/lib/sorteio";

export type TimeActionState = { error?: string } | undefined;

const NOMES_TIMES = ["Time A", "Time B", "Time C", "Time D"];

export async function sortearTimes(
  sessaoId: string,
  _prevState: TimeActionState,
  formData: FormData,
): Promise<TimeActionState> {
  const numTimes = Number(formData.get("num_times") ?? 2);
  const supabase = await createClient();

  const { data: sessao } = await supabase
    .from("sessoes_pelada")
    .select("grupo_id")
    .eq("id", sessaoId)
    .single();
  if (!sessao) return { error: "sessao_nao_encontrada" };

  const { data: presencas } = await supabase
    .from("presencas")
    .select("usuario_id, perfil:perfis(posicao_preferida)")
    .eq("sessao_id", sessaoId)
    .in("status", ["confirmado", "confirmado_pendente_pagamento"])
    .returns<{ usuario_id: string; perfil: { posicao_preferida: string | null } }[]>();

  if (!presencas || presencas.length < numTimes) {
    return { error: "confirmados_insuficientes" };
  }

  const jogadores = await Promise.all(
    presencas.map(async (p) => {
      const { data } = await supabase.rpc("media_avaliacao_jogador", {
        p_usuario_id: p.usuario_id,
      });
      return {
        usuarioId: p.usuario_id,
        posicao: p.perfil.posicao_preferida,
        media: data?.[0]?.media != null ? Number(data[0].media) : null,
      };
    }),
  );

  const times = balancear(jogadores, numTimes);

  // re-sortear = apaga os times atuais (cascade leva times_jogadores junto)
  await supabase.from("times_sorteio").delete().eq("sessao_id", sessaoId);

  // ids gerados no app (sem RETURNING) — ver gotcha de RLS no CLAUDE.md
  const rows = times.map((_, i) => ({
    id: crypto.randomUUID(),
    sessao_id: sessaoId,
    nome: NOMES_TIMES[i],
  }));
  const { error } = await supabase.from("times_sorteio").insert(rows);
  if (error) return { error: error.message };

  const { error: erroJogadores } = await supabase.from("times_jogadores").insert(
    times.flatMap((time, i) =>
      time.map((j) => ({ time_id: rows[i].id, usuario_id: j.usuarioId })),
    ),
  );
  if (erroJogadores) return { error: erroJogadores.message };

  revalidatePath("/", "layout");
}

export async function moverJogador(
  deTimeId: string,
  paraTimeId: string,
  usuarioId: string,
) {
  const supabase = await createClient();
  await supabase
    .from("times_jogadores")
    .update({ time_id: paraTimeId })
    .eq("time_id", deTimeId)
    .eq("usuario_id", usuarioId);
  revalidatePath("/", "layout");
}

export async function definirCapitao(timeId: string, usuarioId: string | null) {
  const supabase = await createClient();
  await supabase
    .from("times_sorteio")
    .update({ capitao_id: usuarioId })
    .eq("id", timeId);
  revalidatePath("/", "layout");
}
