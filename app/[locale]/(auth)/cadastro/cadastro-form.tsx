"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signUp } from "@/lib/supabase/actions";
import { Logo } from "@/components/fivea/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function CadastroForm({ locale }: { locale: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signUp.bind(null, locale), undefined);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-ink-navy px-6 py-16 text-chalk">
      <Logo size={72} className="h-16 w-16 rounded-2xl" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl uppercase">{t("cadastroTitle")}</CardTitle>
          <CardDescription>{t("cadastroDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <FieldDescription>{t("passwordHint")}</FieldDescription>
              </Field>
              {state?.error && <FieldError>{state.error}</FieldError>}
              <Button
                type="submit"
                disabled={pending}
                className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
              >
                {t("cadastroCta")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="font-mono text-sm text-graphite-soft">
        {t("cadastroFooter")}{" "}
        <Link href="/login" className="text-cone-yellow underline underline-offset-4">
          {t("loginLink")}
        </Link>
      </p>
    </main>
  );
}
