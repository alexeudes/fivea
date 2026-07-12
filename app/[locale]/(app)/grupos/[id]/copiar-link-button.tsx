"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function CopiarLinkButton({ locale, codigo }: { locale: string; codigo: string }) {
  const t = useTranslations("Grupos");
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(
      `${location.origin}/${locale}/convite/${codigo}`,
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={copiar}>
      {copiado ? t("linkCopiado") : t("copiarLink")}
    </Button>
  );
}
