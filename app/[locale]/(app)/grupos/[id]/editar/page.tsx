import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { editarGrupo } from "@/lib/supabase/grupo-actions";
import { GrupoForm } from "../../grupo-form";

export default async function EditarGrupoPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("Grupos");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: grupo } = await supabase
    .from("grupos_pelada")
    .select("*")
    .eq("id", id)
    .single();

  // RLS deixaria o update falhar de qualquer jeito; aqui só escondemos a tela.
  if (!grupo || grupo.organizador_id !== user?.id) notFound();

  return (
    <GrupoForm
      action={editarGrupo.bind(null, locale, id)}
      titulo={t("editarTitulo")}
      submitLabel={t("salvar")}
      initial={{
        nome: grupo.nome,
        tipo: grupo.tipo,
        local: grupo.local ?? "",
        frequencia: grupo.frequencia,
        diaSemana: grupo.dia_semana != null ? String(grupo.dia_semana) : "",
        horario: grupo.horario ? grupo.horario.slice(0, 5) : "",
        valorDiaria: grupo.valor_diaria != null ? String(grupo.valor_diaria) : "",
        valorMensalidade:
          grupo.valor_mensalidade != null ? String(grupo.valor_mensalidade) : "",
      }}
    />
  );
}
