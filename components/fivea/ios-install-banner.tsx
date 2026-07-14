"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fivea-ios-install-dismissed";

// iOS só entrega web push com o PWA instalado na tela de início — este
// banner explica isso pra quem abre no Safari. Some depois de dispensado.
export function IosInstallBanner() {
  const t = useTranslations("Push");
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const ios =
      /iphone|ipad|ipod/i.test(nav.userAgent) ||
      // iPadOS se apresenta como Mac, mas com touch
      (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
    // detecção só existe no client (UA/localStorage) — SSR renderiza nada e
    // o banner entra depois da hidratação, por isso o setState no effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios && !instalado && !localStorage.getItem(DISMISS_KEY)) setMostrar(true);
  }, []);

  if (!mostrar) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-cone-yellow/50 bg-card p-4 shadow-lg">
      <p className="text-sm font-medium">{t("iosTitulo")}</p>
      <p className="mt-1 text-xs text-graphite-soft dark:text-chalk/60">{t("iosTexto")}</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setMostrar(false);
        }}
      >
        {t("entendi")}
      </Button>
    </div>
  );
}
