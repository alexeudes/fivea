import { createClient } from "@/lib/supabase/server";
import { NotificacoesToast } from "@/components/fivea/notificacoes-toast";

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
      {children}
      {!!notificacoes?.length && <NotificacoesToast notificacoes={notificacoes} />}
    </>
  );
}
