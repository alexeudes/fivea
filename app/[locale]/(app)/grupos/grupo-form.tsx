"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { GrupoActionState } from "@/lib/supabase/grupo-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type GrupoInitial = {
  nome: string;
  tipo: string;
  local: string;
  frequencia: string;
  diaSemana: string;
  horario: string;
  valorDiaria: string;
  valorMensalidade: string;
};

const VAZIO: GrupoInitial = {
  nome: "",
  tipo: "futebol",
  local: "",
  frequencia: "sem_frequencia",
  diaSemana: "",
  horario: "",
  valorDiaria: "",
  valorMensalidade: "",
};

export function GrupoForm({
  action,
  titulo,
  submitLabel,
  initial = VAZIO,
}: {
  action: (prev: GrupoActionState, formData: FormData) => Promise<GrupoActionState>;
  titulo: string;
  submitLabel: string;
  initial?: GrupoInitial;
}) {
  const t = useTranslations("Grupos");
  const [state, formAction, pending] = useActionState(action, undefined);
  const [frequencia, setFrequencia] = useState(initial.frequencia);
  const recorrente = frequencia !== "sem_frequencia";

  return (
    <main className="flex flex-1 items-start justify-center px-6 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl uppercase">{titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="nome">{t("nome")}</FieldLabel>
                <Input id="nome" name="nome" defaultValue={initial.nome} required />
              </Field>

              <Field>
                <FieldLabel htmlFor="tipo">{t("tipo")}</FieldLabel>
                <NativeSelect id="tipo" name="tipo" defaultValue={initial.tipo} className="w-full">
                  <NativeSelectOption value="futebol">{t("tipoFutebol")}</NativeSelectOption>
                  <NativeSelectOption value="futsal">{t("tipoFutsal")}</NativeSelectOption>
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="local">{t("local")}</FieldLabel>
                <Input id="local" name="local" defaultValue={initial.local} />
              </Field>

              <Field>
                <FieldLabel htmlFor="frequencia">{t("frequencia")}</FieldLabel>
                <NativeSelect
                  id="frequencia"
                  name="frequencia"
                  value={frequencia}
                  onChange={(e) => setFrequencia(e.target.value)}
                  className="w-full"
                >
                  <NativeSelectOption value="semanal">{t("frequenciaSemanal")}</NativeSelectOption>
                  <NativeSelectOption value="quinzenal">{t("frequenciaQuinzenal")}</NativeSelectOption>
                  <NativeSelectOption value="sem_frequencia">
                    {t("frequenciaSemFrequencia")}
                  </NativeSelectOption>
                </NativeSelect>
              </Field>

              {recorrente && (
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="dia_semana">{t("diaSemana")}</FieldLabel>
                    <NativeSelect
                      id="dia_semana"
                      name="dia_semana"
                      defaultValue={initial.diaSemana}
                      className="w-full"
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                        <NativeSelectOption key={d} value={String(d)}>
                          {t(`dia${d}`)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="horario">{t("horario")}</FieldLabel>
                    <Input id="horario" name="horario" type="time" defaultValue={initial.horario} />
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="valor_diaria">{t("valorDiaria")}</FieldLabel>
                  <Input
                    id="valor_diaria"
                    name="valor_diaria"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    defaultValue={initial.valorDiaria}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="valor_mensalidade">{t("valorMensalidade")}</FieldLabel>
                  <Input
                    id="valor_mensalidade"
                    name="valor_mensalidade"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    defaultValue={initial.valorMensalidade}
                  />
                </Field>
              </div>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button
                type="submit"
                disabled={pending}
                className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
              >
                {submitLabel}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
