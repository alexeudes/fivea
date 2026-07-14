"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

// Botão + exibição da cobrança Pix (QR code e copia-e-cola). Usado tanto
// pra diária (sessao_id) quanto pra mensalidade (assinatura_id).
export function PagarPix({
  payload,
  brCodeInicial,
  label,
}: {
  payload: { sessao_id: string } | { assinatura_id: string };
  brCodeInicial: string | null;
  label: string;
}) {
  const t = useTranslations("Pagamentos");
  const router = useRouter();
  const [brCode, setBrCode] = useState<string | null>(brCodeInicial);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setCarregando(true);
    setErro(null);
    const resposta = await fetch("/api/pagamentos/criar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      // mensagem do servidor só no console — pro usuário, erro genérico traduzido
      console.error("pagamento:", dados.error);
      setErro(t("erro"));
    } else {
      setBrCode(dados.br_code);
      setQrBase64(dados.br_code_base64 ?? null);
    }
    setCarregando(false);
  }

  async function copiar() {
    await navigator.clipboard.writeText(brCode!);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (!brCode) {
    return (
      <div className="flex flex-col gap-2">
        <Button
          onClick={gerar}
          disabled={carregando}
          className="bg-whistle-orange text-chalk hover:bg-whistle-orange/90"
        >
          {carregando ? t("gerando") : label}
        </Button>
        {erro && <FieldError>{erro}</FieldError>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {qrBase64 && (
        // eslint-disable-next-line @next/next/no-img-element -- data URI do AbacatePay
        <img
          src={qrBase64.startsWith("data:") ? qrBase64 : `data:image/png;base64,${qrBase64}`}
          alt="QR Code Pix"
          className="mx-auto size-48 rounded-lg border bg-white p-2"
        />
      )}
      <div>
        <p className="mb-1 text-xs text-graphite-soft dark:text-chalk/60">{t("copiaECola")}</p>
        <code
          data-slot="pix-br-code"
          className="block break-all rounded-lg border bg-muted p-2 font-mono text-xs"
        >
          {brCode}
        </code>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={copiar}>
          {copiado ? t("copiado") : t("copiar")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.refresh()}>
          {t("atualizarStatus")}
        </Button>
      </div>
      <p className="text-xs text-graphite-soft dark:text-chalk/60">{t("aposPagar")}</p>
    </div>
  );
}
