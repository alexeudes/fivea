"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type PerfilActionState = { error?: string } | undefined;

export async function completarPerfil(
  locale: string,
  _prevState: PerfilActionState,
  formData: FormData,
): Promise<PerfilActionState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const perna = String(formData.get("perna") ?? "destro");
  const posicaoPreferida = String(formData.get("posicao_preferida") ?? "");
  const avatarUrl = String(formData.get("avatar_url") ?? "");

  if (!nome) {
    const t = await getTranslations({ locale, namespace: "Erros" });
    return { error: t("informeNome") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { error } = await supabase
    .from("perfis")
    .update({
      nome,
      perna,
      posicao_preferida: posicaoPreferida || null,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}/inicio`);
}
