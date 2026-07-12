import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { criarSessao } from "@/lib/supabase/sessao-actions";
import { NovaSessaoForm } from "./nova-sessao-form";

export default async function NovaSessaoPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("Sessoes");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: grupo } = await supabase
    .from("grupos_pelada")
    .select("organizador_id, local, horario")
    .eq("id", id)
    .single();

  // RLS bloquearia o insert de qualquer jeito; aqui só escondemos a tela.
  if (!grupo || grupo.organizador_id !== user?.id) notFound();

  return (
    <NovaSessaoForm
      action={criarSessao.bind(null, locale, id)}
      titulo={t("novaSessao")}
      initial={{
        local: grupo.local ?? "",
        horario: grupo.horario ? grupo.horario.slice(0, 5) : "",
      }}
    />
  );
}
