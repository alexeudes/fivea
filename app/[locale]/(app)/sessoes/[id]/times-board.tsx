"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { moverJogador, definirCapitao } from "@/lib/supabase/time-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export type Time = {
  id: string;
  nome: string;
  capitaoId: string | null;
  jogadores: { usuarioId: string; nome: string }[];
};

// ponytail: drag nativo HTML5 + toque-pra-mover como fallback (drag nativo
// não funciona em touch). Se um dia precisar de drag animado em mobile,
// trocar por dnd-kit.
export function TimesBoard({
  times,
  souOrganizador,
}: {
  times: Time[];
  souOrganizador: boolean;
}) {
  const t = useTranslations("Times");
  const [selecionado, setSelecionado] = useState<{ usuarioId: string; timeId: string } | null>(null);
  const [, startTransition] = useTransition();

  function mover(deTimeId: string, paraTimeId: string, usuarioId: string) {
    setSelecionado(null);
    if (deTimeId === paraTimeId) return;
    startTransition(() => moverJogador(deTimeId, paraTimeId, usuarioId));
  }

  return (
    <div>
      {souOrganizador && (
        <p className="mb-3 text-xs text-graphite-soft dark:text-chalk/60">{t("moverDica")}</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {times.map((time) => (
          <Card
            key={time.id}
            data-slot="time-card"
            data-time-nome={time.nome}
            onDragOver={(e) => souOrganizador && e.preventDefault()}
            onDrop={(e) => {
              if (!souOrganizador) return;
              const { usuarioId, timeId } = JSON.parse(e.dataTransfer.getData("text/plain"));
              mover(timeId, time.id, usuarioId);
            }}
            onClick={() => {
              if (selecionado) mover(selecionado.timeId, time.id, selecionado.usuarioId);
            }}
          >
            <CardHeader>
              <CardTitle className="font-heading uppercase">{time.nome}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {time.jogadores.map((jogador) => (
                <div
                  key={jogador.usuarioId}
                  data-slot="time-jogador"
                  draggable={souOrganizador}
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "text/plain",
                      JSON.stringify({ usuarioId: jogador.usuarioId, timeId: time.id }),
                    )
                  }
                  onClick={(e) => {
                    if (!souOrganizador) return;
                    e.stopPropagation();
                    // seleção pendente de outro time → tocar aqui completa o movimento
                    if (selecionado && selecionado.timeId !== time.id) {
                      mover(selecionado.timeId, time.id, selecionado.usuarioId);
                      return;
                    }
                    setSelecionado((atual) =>
                      atual?.usuarioId === jogador.usuarioId
                        ? null
                        : { usuarioId: jogador.usuarioId, timeId: time.id },
                    );
                  }}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${
                    souOrganizador ? "cursor-grab" : ""
                  } ${
                    selecionado?.usuarioId === jogador.usuarioId
                      ? "border-whistle-orange ring-2 ring-whistle-orange/40"
                      : ""
                  }`}
                >
                  <span className="flex-1">{jogador.nome}</span>
                  {time.capitaoId === jogador.usuarioId && (
                    <Badge className="bg-whistle-orange text-chalk">{t("capitao")}</Badge>
                  )}
                </div>
              ))}

              {souOrganizador && (
                <div className="mt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <NativeSelect
                    aria-label={t("capitao")}
                    className="flex-1"
                    value={time.capitaoId ?? ""}
                    onChange={(e) =>
                      startTransition(() => definirCapitao(time.id, e.target.value || null))
                    }
                  >
                    <NativeSelectOption value="">{t("semCapitao")}</NativeSelectOption>
                    {time.jogadores.map((jogador) => (
                      <NativeSelectOption key={jogador.usuarioId} value={jogador.usuarioId}>
                        {jogador.nome}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!time.jogadores.length}
                    onClick={() => {
                      const sorteado =
                        time.jogadores[Math.floor(Math.random() * time.jogadores.length)];
                      startTransition(() => definirCapitao(time.id, sorteado.usuarioId));
                    }}
                  >
                    {t("capitaoAleatorio")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
