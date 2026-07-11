import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompletarPerfilForm } from "./completar-perfil-form";

export default async function CompletarPerfilPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, perna, posicao_preferida, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <CompletarPerfilForm
      locale={locale}
      userId={user.id}
      initial={{
        nome: perfil?.nome ?? "",
        perna: perfil?.perna ?? "destro",
        posicaoPreferida: perfil?.posicao_preferida ?? "",
        avatarUrl: perfil?.avatar_url ?? "",
      }}
    />
  );
}
