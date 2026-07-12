"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function criarGoleiro(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const valorPadrao = String(formData.get("valor_padrao") ?? "");
  await supabase.from("goleiros_avulsos").insert({
    criado_por: user.id,
    nome,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    valor_padrao: valorPadrao ? Number(valorPadrao) : null,
  });
  revalidatePath("/", "layout");
}

export async function excluirGoleiro(id: string) {
  const supabase = await createClient();
  await supabase.from("goleiros_avulsos").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function vincularGoleiro(sessaoId: string, formData: FormData) {
  const goleiroId = String(formData.get("goleiro_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("sessoes_pelada")
    .update({ goleiro_avulso_id: goleiroId || null })
    .eq("id", sessaoId);
  revalidatePath("/", "layout");
}
