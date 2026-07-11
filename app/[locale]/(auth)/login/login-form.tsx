"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signIn } from "@/lib/supabase/actions";
import { Logo } from "@/components/fivea/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ locale, next }: { locale: string; next: string }) {
  const t = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(signIn.bind(null, locale), undefined);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-ink-navy px-6 py-16 text-chalk">
      <Logo size={72} className="h-16 w-16 rounded-2xl" />

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl uppercase">{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <input type="hidden" name="next" value={next} />
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
                  autoComplete="current-password"
                  required
                />
              </Field>
              {state?.error && <FieldError>{state.error}</FieldError>}
              <Button
                type="submit"
                disabled={pending}
                className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
              >
                {t("loginCta")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <p className="font-mono text-sm text-graphite-soft">
        {t("loginFooter")}{" "}
        <Link href="/cadastro" className="text-cone-yellow underline underline-offset-4">
          {t("cadastroLink")}
        </Link>
      </p>
    </main>
  );
}
