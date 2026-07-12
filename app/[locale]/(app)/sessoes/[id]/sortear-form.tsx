"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { sortearTimes, type TimeActionState } from "@/lib/supabase/time-actions";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function SortearForm({ sessaoId, jaSorteado }: { sessaoId: string; jaSorteado: boolean }) {
  const t = useTranslations("Times");
  const [state, formAction, pending] = useActionState(
    sortearTimes.bind(null, sessaoId),
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <NativeSelect name="num_times" defaultValue="2" aria-label={t("numTimes")}>
          {[2, 3, 4].map((n) => (
            <NativeSelectOption key={n} value={String(n)}>
              {n} {t("titulo").toLowerCase()}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          type="submit"
          disabled={pending}
          className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
        >
          {jaSorteado ? t("reSortear") : t("sortear")}
        </Button>
      </div>
      {state?.error && (
        <FieldError>
          {state.error === "confirmados_insuficientes"
            ? t("confirmadosInsuficientes")
            : state.error}
        </FieldError>
      )}
    </form>
  );
}
