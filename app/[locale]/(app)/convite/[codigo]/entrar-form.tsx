"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { GrupoActionState } from "@/lib/supabase/grupo-actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";

export function EntrarForm({
  action,
}: {
  action: (prev: GrupoActionState, formData: FormData) => Promise<GrupoActionState>;
}) {
  const t = useTranslations("Grupos");
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field>
          <FieldLabel>{t("tipoPagamento")}</FieldLabel>
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-checked:border-cone-yellow">
              <input type="radio" name="tipo_pagamento" value="diarista" defaultChecked />
              <span>
                <span className="block text-sm font-medium">{t("diarista")}</span>
                <span className="block text-xs text-graphite-soft dark:text-chalk/60">
                  {t("diaristaDescricao")}
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-checked:border-court-blue">
              <input type="radio" name="tipo_pagamento" value="mensalista" />
              <span>
                <span className="block text-sm font-medium">{t("mensalista")}</span>
                <span className="block text-xs text-graphite-soft dark:text-chalk/60">
                  {t("mensalistaDescricao")}
                </span>
              </span>
            </label>
          </div>
        </Field>

        {state?.error && <FieldError>{state.error}</FieldError>}

        <Button
          type="submit"
          disabled={pending}
          className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
        >
          {t("entrar")}
        </Button>
      </FieldGroup>
    </form>
  );
}
