"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Alterna pt-BR ⇄ en mantendo a rota atual.
export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("App");
  const alvo = locale === "pt-BR" ? "en" : "pt-BR";

  return (
    <Link
      href={pathname}
      locale={alvo}
      aria-label={t("trocarIdioma")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-xs uppercase text-graphite-soft transition-colors hover:text-foreground dark:text-chalk/60 dark:hover:text-chalk",
        className,
      )}
    >
      <Globe className="size-4" aria-hidden />
      {alvo === "en" ? "EN" : "PT"}
    </Link>
  );
}
