import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { LogoutButton } from "@/components/fivea/logout-button";

export default async function InicioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("App");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = user
    ? await supabase.from("perfis").select("nome").eq("id", user.id).single()
    : { data: null };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="font-mono text-sm text-graphite-soft">
        {perfil?.nome ? t("ola", { nome: perfil.nome }) : t("inicioEmConstrucao")}
      </p>
      <Link href="/perfil/completar" className="text-sm text-court-blue underline underline-offset-4">
        {t("editarPerfil")}
      </Link>
      <LogoutButton locale={locale} />
    </main>
  );
}
