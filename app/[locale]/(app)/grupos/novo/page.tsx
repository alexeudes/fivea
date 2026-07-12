import { getTranslations } from "next-intl/server";
import { criarGrupo } from "@/lib/supabase/grupo-actions";
import { GrupoForm } from "../grupo-form";

export default async function NovoGrupoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Grupos");

  return (
    <GrupoForm
      action={criarGrupo.bind(null, locale)}
      titulo={t("novoTitulo")}
      submitLabel={t("criar")}
    />
  );
}
