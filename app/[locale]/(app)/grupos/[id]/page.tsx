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
import { MediaAvaliacao } from "@/components/fivea/media-avaliacao";
import { PagarPix } from "@/components/fivea/pagar-pix";
import { CopiarLinkButton } from "./copiar-link-button";

export default async function GrupoDetalhesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations("Grupos");
  const tSessoes = await getTranslations("Sessoes");
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

  const [{ data: sessoes }, { data: realizadas }] = await Promise.all([
    supabase
      .from("sessoes_pelada")
      .select("id, data_hora, local, status")
      .eq("grupo_id", id)
      .eq("status", "agendada")
      .gte("data_hora", new Date().toISOString())
      .order("data_hora")
      .limit(6),
    supabase
      .from("sessoes_pelada")
      .select("id, data_hora, local")
      .eq("grupo_id", id)
      .eq("status", "realizada")
      .order("data_hora", { ascending: false })
      .limit(3),
  ]);

  const formataData = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  // assinatura do usuário logado neste grupo (só mensalista tem)
  const { data: minhaAssinatura } = user
    ? await supabase
        .from("assinaturas")
        .select("id, status")
        .eq("grupo_id", id)
        .eq("usuario_id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: pagamentoAssinaturaPendente } = minhaAssinatura
    ? await supabase
        .from("pagamentos")
        .select("qr_code")
        .eq("assinatura_id", minhaAssinatura.id)
        .eq("status", "pendente")
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  const tPagamentos = await getTranslations("Pagamentos");
  const valorMensalidade =
    grupo.valor_mensalidade != null
      ? new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
          Number(grupo.valor_mensalidade),
        )
      : null;
  const statusAssinaturaLabel = {
    ativa: tPagamentos("assinaturaAtiva"),
    inadimplente: tPagamentos("assinaturaInadimplente"),
    cancelada: tPagamentos("assinaturaCancelada"),
  } as const;

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

  // média agregada via media_avaliacao_jogador() — notas individuais nunca saem do banco
  const tAvaliacoes = await getTranslations("Avaliacoes");
  const medias = new Map(
    await Promise.all(
      pessoas.map(async (p) => {
        const { data } = await supabase.rpc("media_avaliacao_jogador", {
          p_usuario_id: p.usuarioId,
        });
        return [
          p.usuarioId,
          data?.[0]?.media != null ? Number(data[0].media) : null,
        ] as const;
      }),
    ),
  );

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

      {minhaAssinatura && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading uppercase">
                {tPagamentos("assinatura")}
              </CardTitle>
              <Badge
                className={
                  minhaAssinatura.status === "ativa"
                    ? "bg-court-blue text-chalk"
                    : "bg-whistle-orange text-chalk"
                }
              >
                {statusAssinaturaLabel[
                  minhaAssinatura.status as keyof typeof statusAssinaturaLabel
                ] ?? minhaAssinatura.status}
              </Badge>
            </div>
            {valorMensalidade && (
              <p className="font-mono text-xs text-graphite-soft dark:text-chalk/60">
                {tPagamentos("mensalidade", { valor: valorMensalidade })}
              </p>
            )}
          </CardHeader>
          {valorMensalidade && (
            <CardContent>
              <PagarPix
                payload={{ assinatura_id: minhaAssinatura.id }}
                brCodeInicial={pagamentoAssinaturaPendente?.qr_code ?? null}
                label={tPagamentos("pagarMensalidade")}
              />
            </CardContent>
          )}
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading uppercase">{tSessoes("proximas")}</CardTitle>
            {souOrganizador && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/grupos/${id}/sessoes/nova`} />}
              >
                {tSessoes("novaSessao")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!sessoes?.length ? (
            <p className="text-sm text-graphite-soft dark:text-chalk/60">
              {tSessoes("nenhumaSessao")}
            </p>
          ) : (
            sessoes.map((sessao) => (
              <Link
                key={sessao.id}
                href={`/sessoes/${sessao.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-court-blue"
              >
                <span className="font-mono text-sm">
                  {formataData.format(new Date(sessao.data_hora))}
                </span>
                {sessao.local && (
                  <span className="text-xs text-graphite-soft dark:text-chalk/60">
                    {sessao.local}
                  </span>
                )}
              </Link>
            ))
          )}
          {(realizadas?.length ?? 0) > 0 && (
            <>
              <p className="mt-2 font-mono text-xs uppercase text-graphite-soft dark:text-chalk/60">
                {tSessoes("realizadasRecentes")}
              </p>
              {realizadas!.map((sessao) => (
                <Link
                  key={sessao.id}
                  href={`/sessoes/${sessao.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-court-blue"
                >
                  <span className="font-mono text-sm">
                    {formataData.format(new Date(sessao.data_hora))}
                  </span>
                  <Badge className="bg-court-blue text-chalk">
                    {tSessoes("statusRealizada")}
                  </Badge>
                </Link>
              ))}
            </>
          )}
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
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {pessoa.nome}
              </span>
              <MediaAvaliacao
                media={medias.get(pessoa.usuarioId) ?? null}
                label={tAvaliacoes("media", {
                  media: (medias.get(pessoa.usuarioId) ?? 0).toFixed(1),
                })}
              />
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
