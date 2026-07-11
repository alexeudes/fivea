"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { completarPerfil } from "@/lib/supabase/perfil-actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Initial = {
  nome: string;
  perna: string;
  posicaoPreferida: string;
  avatarUrl: string;
};

export function CompletarPerfilForm({
  locale,
  userId,
  initial,
}: {
  locale: string;
  userId: string;
  initial: Initial;
}) {
  const t = useTranslations("Perfil");
  const [state, formAction, pending] = useActionState(
    completarPerfil.bind(null, locale),
    undefined,
  );
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [uploading, setUploading] = useState(false);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: true,
    });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
    }
    setUploading(false);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-2xl uppercase">
            {t("completarTitle")}
          </CardTitle>
          <CardDescription>{t("completarDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <input type="hidden" name="avatar_url" value={avatarUrl} />
            <FieldGroup>
              <Field orientation="horizontal">
                <Avatar size="lg">
                  <AvatarImage src={avatarUrl} alt="" />
                  <AvatarFallback>{initial.nome.slice(0, 2).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <FieldLabel htmlFor="foto">{t("foto")}</FieldLabel>
                  <Input id="foto" type="file" accept="image/*" onChange={handleFotoChange} />
                  {uploading && (
                    <p className="mt-1 font-mono text-xs text-graphite-soft">
                      {t("enviandoFoto")}
                    </p>
                  )}
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="nome">{t("nome")}</FieldLabel>
                <Input id="nome" name="nome" defaultValue={initial.nome} required />
              </Field>

              <Field>
                <FieldLabel htmlFor="perna">{t("perna")}</FieldLabel>
                <NativeSelect id="perna" name="perna" defaultValue={initial.perna} className="w-full">
                  <NativeSelectOption value="destro">{t("pernaDestro")}</NativeSelectOption>
                  <NativeSelectOption value="canhoto">{t("pernaCanhoto")}</NativeSelectOption>
                  <NativeSelectOption value="ambidestro">{t("pernaAmbidestro")}</NativeSelectOption>
                </NativeSelect>
              </Field>

              <Field>
                <FieldLabel htmlFor="posicao_preferida">{t("posicaoPreferida")}</FieldLabel>
                <NativeSelect
                  id="posicao_preferida"
                  name="posicao_preferida"
                  defaultValue={initial.posicaoPreferida}
                  className="w-full"
                >
                  <NativeSelectOption value="">—</NativeSelectOption>
                  <NativeSelectOption value="goleiro">{t("posicaoGoleiro")}</NativeSelectOption>
                  <NativeSelectOption value="zagueiro">{t("posicaoZagueiro")}</NativeSelectOption>
                  <NativeSelectOption value="lateral">{t("posicaoLateral")}</NativeSelectOption>
                  <NativeSelectOption value="volante">{t("posicaoVolante")}</NativeSelectOption>
                  <NativeSelectOption value="meia">{t("posicaoMeia")}</NativeSelectOption>
                  <NativeSelectOption value="atacante">{t("posicaoAtacante")}</NativeSelectOption>
                </NativeSelect>
              </Field>

              {state?.error && <FieldError>{state.error}</FieldError>}

              <Button
                type="submit"
                disabled={pending || uploading}
                className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
              >
                {t("salvar")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
