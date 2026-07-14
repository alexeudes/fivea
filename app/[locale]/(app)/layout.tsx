import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/fivea/app-header";
import { NotificacoesToast } from "@/components/fivea/notificacoes-toast";
import { IosInstallBanner } from "@/components/fivea/ios-install-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notificacoes } = user
    ? await supabase
        .from("notificacoes")
        .select("id, titulo, link")
        .eq("lida", false)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: null };

  return (
    <>
      <AppHeader />
      {children}
      <IosInstallBanner />
      {!!notificacoes?.length && <NotificacoesToast notificacoes={notificacoes} />}
    </>
  );
}
