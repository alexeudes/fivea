import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { criarGoleiro, excluirGoleiro } from "@/lib/supabase/goleiro-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/fivea/confirm-button";

export default async function GoleirosPage() {
  const t = await getTranslations("Goleiros");
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goleiros } = await supabase
    .from("goleiros_avulsos")
    .select("id, nome, telefone, valor_padrao, criado_por")
    .order("nome");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-heading text-3xl uppercase">{t("titulo")}</h1>
      <p className="mb-6 text-sm text-graphite-soft dark:text-chalk/60">{t("descricao")}</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading uppercase">{t("adicionar")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarGoleiro}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="nome">{t("nome")}</FieldLabel>
                <Input id="nome" name="nome" required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="telefone">{t("telefone")}</FieldLabel>
                  <Input id="telefone" name="telefone" type="tel" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="valor_padrao">{t("valorPadrao")}</FieldLabel>
                  <Input
                    id="valor_padrao"
                    name="valor_padrao"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <Button
                type="submit"
                className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
              >
                {t("adicionar")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {!goleiros?.length ? (
        <p className="text-sm text-graphite-soft dark:text-chalk/60">{t("nenhum")}</p>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4">
            {goleiros.map((goleiro) => (
              <div key={goleiro.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{goleiro.nome}</p>
                  <p className="font-mono text-xs text-graphite-soft dark:text-chalk/60">
                    {[
                      goleiro.telefone,
                      goleiro.valor_padrao != null ? `R$ ${goleiro.valor_padrao}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {goleiro.criado_por === user?.id && (
                  <ConfirmButton
                    action={excluirGoleiro.bind(null, goleiro.id)}
                    confirmMessage={t("confirmarExclusao", { nome: goleiro.nome })}
                    className="text-destructive"
                  >
                    {t("excluir")}
                  </ConfirmButton>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
