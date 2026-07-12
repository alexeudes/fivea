import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { excluirGrupo, removerMembro } from "@/lib/supabase/grupo-actions";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmButton } from "@/components/fivea/confirm-button";
import { CopiarLinkButton } from "./copiar-link-button";

export default async function GrupoDetalhesPage({
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
    .select("*, organizador:perfis!organizador_id(id, nome, avatar_url)")
    .eq("id", id)
    .single();

  if (!grupo) notFound();

  const { data: membros } = await supabase
    .from("membros_grupo")
    .select("usuario_id, tipo_pagamento, perfil:perfis(nome, avatar_url)")
    .eq("grupo_id", id)
    .eq("ativo", true)
    .order("entrou_em")
    // sem tipos gerados do banco, o embed 1:1 via FK é inferido como array
    .returns<
      {
        usuario_id: string;
        tipo_pagamento: "diarista" | "mensalista";
        perfil: { nome: string; avatar_url: string | null };
      }[]
    >();

  const souOrganizador = user?.id === grupo.organizador_id;

  const pessoas = [
    {
      usuarioId: grupo.organizador.id,
      nome: grupo.organizador.nome as string,
      avatarUrl: grupo.organizador.avatar_url as string | null,
      papel: "organizador" as const,
    },
    ...(membros ?? [])
      .filter((m) => m.usuario_id !== grupo.organizador_id)
      .map((m) => ({
        usuarioId: m.usuario_id,
        nome: m.perfil.nome,
        avatarUrl: m.perfil.avatar_url,
        papel: m.tipo_pagamento,
      })),
  ];

  const badgeClasses = {
    organizador: "bg-whistle-orange text-chalk",
    mensalista: "bg-court-blue text-chalk",
    diarista: "bg-cone-yellow text-graphite",
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl uppercase">{grupo.nome}</h1>
          <p className="font-mono text-xs text-graphite-soft dark:text-chalk/60">
            {t(grupo.tipo === "futsal" ? "tipoFutsal" : "tipoFutebol")}
            {grupo.local ? ` · ${grupo.local}` : ""}
            {grupo.dia_semana != null ? ` · ${t(`dia${grupo.dia_semana}`)}` : ""}
            {grupo.horario ? ` · ${grupo.horario.slice(0, 5)}` : ""}
          </p>
        </div>
        {souOrganizador && (
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/grupos/${id}/editar`} />}>
            {t("editar")}
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase">{t("convite")}</CardTitle>
          <CardDescription>{t("conviteDescricao")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <code className="font-mono text-sm">{grupo.codigo_convite}</code>
          <CopiarLinkButton locale={locale} codigo={grupo.codigo_convite} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading uppercase">
            {t("membros")} ({pessoas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pessoas.map((pessoa) => (
            <div key={pessoa.usuarioId} className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={pessoa.avatarUrl ?? undefined} alt="" />
                <AvatarFallback>{pessoa.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{pessoa.nome}</span>
              <Badge className={badgeClasses[pessoa.papel]}>{t(pessoa.papel)}</Badge>
              {souOrganizador && pessoa.papel !== "organizador" && (
                <ConfirmButton
                  action={removerMembro.bind(null, id, pessoa.usuarioId)}
                  confirmMessage={t("confirmarRemocao", { nome: pessoa.nome })}
                  className="text-destructive"
                >
                  {t("removerMembro")}
                </ConfirmButton>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {souOrganizador && (
        <div className="mt-8 flex justify-end">
          <ConfirmButton
            action={excluirGrupo.bind(null, locale, id)}
            confirmMessage={t("confirmarExclusao")}
            className="text-destructive"
          >
            {t("excluir")}
          </ConfirmButton>
        </div>
      )}
    </main>
  );
}
