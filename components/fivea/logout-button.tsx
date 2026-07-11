import { useTranslations } from "next-intl";
import { signOut } from "@/lib/supabase/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ locale }: { locale: string }) {
  const t = useTranslations("App");

  return (
    <form action={signOut.bind(null, locale)}>
      <Button type="submit" variant="outline">
        {t("sair")}
      </Button>
    </form>
  );
}
