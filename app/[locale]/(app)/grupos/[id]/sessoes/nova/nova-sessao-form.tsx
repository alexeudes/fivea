"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { SessaoActionState } from "@/lib/supabase/sessao-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function NovaSessaoForm({
  action,
  titulo,
  initial,
}: {
  action: (prev: SessaoActionState, formData: FormData) => Promise<SessaoActionState>;
  titulo: string;
  initial: { local: string; horario: string };
}) {
  const t = useTranslations("Sessoes");
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <main className="flex flex-1 items-start justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl uppercase">{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="data">{t("data")}</FieldLabel>
                  <Input id="data" name="data" type="date" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="horario">{t("horario")}</FieldLabel>
                  <Input
                    id="horario"
                    name="horario"
                    type="time"
                    defaultValue={initial.horario}
                    required
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="local">{t("local")}</FieldLabel>
                <Input id="local" name="local" defaultValue={initial.local} />
              </Field>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button
                type="submit"
                disabled={pending}
                className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
              >
                {t("criar")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
