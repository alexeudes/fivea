import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { marcarPresenca } from "@/lib/supabase/sessao-actions";
import { vincularGoleiro } from "@/lib/supabase/goleiro-actions";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SortearForm } from "./sortear-form";
import { TimesBoard, type Time } from "./times-board";

// Chips de presença conforme a identidade visual (CLAUDE.md)
const CHIP: Record<string, string> = {
  confirmado: "bg-court-blue text-chalk",
  duvida: "bg-cone-yellow text-graphite",
  confirmado_pendente_pagamento: "bg-whistle-orange text-chalk",
  fora: "bg-graphite-soft text-chalk",
};

const CHIP_LABEL: Record<string, string> = {
  confirmado: "statusConfirmado",
  duvida: "statusDuvida",
  confirmado_pendente_pagamento: "statusConfirmadoPendentePagamento",
  fora: "statusFora",
};

export default async function SessaoPage({
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

  const { data: sessao } = await supabase
    .from("sessoes_pelada")
    .select(
      "*, grupo:grupos_pelada(id, nome, organizador_id, organizador:perfis!organizador_id(id, nome, avatar_url)), goleiro:goleiros_avulsos(id, nome)",
    )
    .eq("id", id)
    .single();

  if (!sessao) notFound();

  const souOrganizador = user?.id === sessao.grupo.organizador_id;

  const [{ data: membros }, { data: presencas }, { data: timesRaw }, { data: pool }] =
    await Promise.all([
      supabase
        .from("membros_grupo")
        .select("usuario_id, perfil:perfis(nome, avatar_url)")
        .eq("grupo_id", sessao.grupo.id)
        .eq("ativo", true)
        .order("entrou_em")
        .returns<
          { usuario_id: string; perfil: { nome: string; avatar_url: string | null } }[]
        >(),
      supabase.from("presencas").select("usuario_id, status").eq("sessao_id", id),
      supabase
        .from("times_sorteio")
        .select("id, nome, capitao_id, jogadores:times_jogadores(usuario_id, perfil:perfis(nome))")
        .eq("sessao_id", id)
        .order("nome")
        .returns<
          {
            id: string;
            nome: string;
            capitao_id: string | null;
            jogadores: { usuario_id: string; perfil: { nome: string } }[];
          }[]
        >(),
      souOrganizador
        ? supabase.from("goleiros_avulsos").select("id, nome").order("nome")
        : Promise.resolve({ data: null }),
    ]);

  const times: Time[] = (timesRaw ?? []).map((time) => ({
    id: time.id,
    nome: time.nome,
    capitaoId: time.capitao_id,
    jogadores: time.jogadores.map((j) => ({ usuarioId: j.usuario_id, nome: j.perfil.nome })),
  }));

  const statusPor = new Map(presencas?.map((p) => [p.usuario_id, p.status]));

  const organizador = sessao.grupo.organizador;
  const pessoas = [
    { usuarioId: organizador.id, nome: organizador.nome, avatarUrl: organizador.avatar_url },
    ...(membros ?? [])
      .filter((m) => m.usuario_id !== organizador.id)
      .map((m) => ({
        usuarioId: m.usuario_id,
        nome: m.perfil.nome,
        avatarUrl: m.perfil.avatar_url,
      })),
  ];

  const confirmados = pessoas.filter((p) =>
    ["confirmado", "confirmado_pendente_pagamento"].includes(
      statusPor.get(p.usuarioId) ?? "",
    ),
  ).length;

  const meuStatus = user ? statusPor.get(user.id) : undefined;
  const tGoleiros = await getTranslations("Goleiros");
  const tTimes = await getTranslations("Times");
  const dataFormatada = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(sessao.data_hora));

  const rsvp = [
    { status: "confirmado", label: t("statusConfirmado"), ativo: "bg-court-blue text-chalk hover:bg-court-blue/90" },
    { status: "duvida", label: t("statusDuvida"), ativo: "bg-cone-yellow text-graphite hover:bg-cone-yellow/90" },
    { status: "fora", label: t("statusFora"), ativo: "bg-graphite-soft text-chalk hover:bg-graphite-soft/90" },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/grupos/${sessao.grupo.id}`}
          className="font-mono text-xs text-court-blue underline underline-offset-4"
        >
          {sessao.grupo.nome}
        </Link>
        <h1 className="font-heading text-3xl uppercase">{dataFormatada}</h1>
        {sessao.local && (
          <p className="font-mono text-xs text-graphite-soft dark:text-chalk/60">
            {sessao.local}
          </p>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase">{t("suaPresenca")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={marcarPresenca.bind(null, id)} className="flex gap-2">
            {rsvp.map((opcao) => (
              <Button
                key={opcao.status}
                type="submit"
                name="status"
                value={opcao.status}
                variant={meuStatus === opcao.status ? "default" : "outline"}
                className={meuStatus === opcao.status ? opcao.ativo : ""}
              >
                {opcao.label}
              </Button>
            ))}
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase">{tGoleiros("goleiroDaSessao")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">{sessao.goleiro?.nome ?? tGoleiros("semGoleiro")}</p>
          {souOrganizador && (
            <>
              <form action={vincularGoleiro.bind(null, id)} className="flex items-center gap-2">
                <NativeSelect
                  name="goleiro_id"
                  defaultValue={sessao.goleiro?.id ?? ""}
                  className="flex-1"
                  aria-label={tGoleiros("goleiroDaSessao")}
                >
                  <NativeSelectOption value="">{tGoleiros("semGoleiro")}</NativeSelectOption>
                  {pool?.map((goleiro) => (
                    <NativeSelectOption key={goleiro.id} value={goleiro.id}>
                      {goleiro.nome}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Button type="submit" variant="outline" size="sm">
                  {tGoleiros("vincular")}
                </Button>
              </form>
              <Link
                href="/goleiros"
                className="font-mono text-xs text-court-blue underline underline-offset-4"
              >
                {tGoleiros("gerenciarPool")}
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase">{tTimes("titulo")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {souOrganizador && <SortearForm sessaoId={id} jaSorteado={times.length > 0} />}
          {times.length > 0 ? (
            <TimesBoard times={times} souOrganizador={souOrganizador} />
          ) : (
            !souOrganizador && (
              <p className="text-sm text-graphite-soft dark:text-chalk/60">
                {tTimes("aindaNaoSorteado")}
              </p>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading uppercase">
            {t("presencas")} · {t("confirmados", { count: confirmados })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {pessoas.map((pessoa) => {
            const status = statusPor.get(pessoa.usuarioId);
            return (
              <div key={pessoa.usuarioId} className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={pessoa.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback>{pessoa.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium">{pessoa.nome}</span>
                {status ? (
                  <Badge className={CHIP[status]}>{t(CHIP_LABEL[status])}</Badge>
                ) : (
                  <Badge variant="outline">{t("statusSemResposta")}</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
