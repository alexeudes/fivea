import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { entrarNoGrupo } from "@/lib/supabase/grupo-actions";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntrarForm } from "./entrar-form";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ locale: string; codigo: string }>;
}) {
  const { locale, codigo } = await params;
  const t = await getTranslations("Grupos");
  const supabase = await createClient();

  const { data: grupos } = await supabase.rpc("grupo_por_codigo", {
    p_codigo: codigo,
  });
  const grupo = grupos?.[0];

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        {!grupo ? (
          <CardHeader>
            <CardTitle className="font-heading text-2xl uppercase">
              {t("conviteInvalido")}
            </CardTitle>
          </CardHeader>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-heading text-2xl uppercase">
                {t("conviteTitulo")}
              </CardTitle>
              <CardDescription>
                {t("conviteEntrarDescricao", { nome: grupo.nome })}
              </CardDescription>
              <p className="font-mono text-xs text-graphite-soft dark:text-chalk/60">
                {t(grupo.tipo === "futsal" ? "tipoFutsal" : "tipoFutebol")}
                {grupo.local ? ` · ${grupo.local}` : ""}
                {grupo.dia_semana != null ? ` · ${t(`dia${grupo.dia_semana}`)}` : ""}
                {grupo.horario ? ` · ${grupo.horario.slice(0, 5)}` : ""}
                {` · ${t("organizador")}: ${grupo.organizador_nome}`}
              </p>
            </CardHeader>
            <CardContent>
              {grupo.ja_membro ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">{t("jaMembro")}</p>
                  <Button
                    nativeButton={false} render={<Link href={`/grupos/${grupo.id}`} />}
                    className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
                  >
                    {t("irParaGrupo")}
                  </Button>
                </div>
              ) : (
                <EntrarForm action={entrarNoGrupo.bind(null, locale, codigo)} />
              )}
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
