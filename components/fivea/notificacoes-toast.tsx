"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { marcarNotificacaoLida } from "@/lib/supabase/sessao-actions";
import { Button } from "@/components/ui/button";

type Notificacao = { id: string; titulo: string; link: string | null };

// ponytail: toast próprio de ~40 linhas em vez de lib de toast — só precisa
// empilhar, linkar e dispensar. Trocar por algo mais parrudo se surgirem
// mais tipos de notificação.
export function NotificacoesToast({ notificacoes }: { notificacoes: Notificacao[] }) {
  const t = useTranslations("Sessoes");
  const [dispensadas, setDispensadas] = useState<string[]>([]);

  function dispensar(id: string) {
    setDispensadas((atual) => [...atual, id]);
    marcarNotificacaoLida(id);
  }

  const visiveis = notificacoes.filter((n) => !dispensadas.includes(n.id));
  if (!visiveis.length) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {visiveis.map((notificacao) => (
        <div
          key={notificacao.id}
          data-slot="notificacao-toast"
          className="flex items-center gap-2 rounded-lg border bg-card p-3 shadow-lg"
        >
          <p className="flex-1 text-sm">{notificacao.titulo}</p>
          {notificacao.link && (
            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={<Link href={notificacao.link} />}
              onClick={() => dispensar(notificacao.id)}
            >
              {t("ver")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            aria-label={t("fechar")}
            onClick={() => dispensar(notificacao.id)}
          >
            ✕
          </Button>
        </div>
      ))}
    </div>
  );
}
