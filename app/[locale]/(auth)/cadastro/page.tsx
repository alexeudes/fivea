import { CadastroForm } from "./cadastro-form";

export default async function CadastroPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <CadastroForm locale={locale} />;
}
