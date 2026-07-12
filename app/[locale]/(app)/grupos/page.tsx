import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function GruposPage() {
  const t = await getTranslations("Grupos");
  const supabase = await createClient();

  // RLS já limita aos grupos onde sou membro ou organizador.
  const { data: grupos } = await supabase
    .from("grupos_pelada")
    .select("id, nome, tipo, local, frequencia, dia_semana, horario")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl uppercase">{t("titulo")}</h1>
        <Button
          nativeButton={false} render={<Link href="/grupos/novo" />}
          className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
        >
          {t("criarGrupo")}
        </Button>
      </div>

      {!grupos?.length ? (
        <p className="text-graphite-soft dark:text-chalk/60">{t("nenhumGrupo")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {grupos.map((grupo) => (
            <Link key={grupo.id} href={`/grupos/${grupo.id}`}>
              <Card className="transition-colors hover:border-court-blue">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-xl uppercase">{grupo.nome}</p>
                    <p className="font-mono text-xs text-graphite-soft dark:text-chalk/60">
                      {t(grupo.tipo === "futsal" ? "tipoFutsal" : "tipoFutebol")}
                      {grupo.local ? ` · ${grupo.local}` : ""}
                      {grupo.dia_semana != null ? ` · ${t(`dia${grupo.dia_semana}`)}` : ""}
                      {grupo.horario ? ` · ${grupo.horario.slice(0, 5)}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
