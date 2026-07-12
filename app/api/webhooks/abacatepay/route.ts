import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { abacatepay } from "@/lib/abacatepay/client";

// Webhook do AbacatePay. Autenticação: query param `webhookSecret`
// (mecanismo documentado do AbacatePay) comparado com o env.
// Além do secret, confirma o status direto na API (trust-but-verify)
// antes de marcar como pago.
export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("webhookSecret");
  if (!secret || secret !== process.env.ABACATEPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const evento: string = body?.event ?? "";
  const chargeId: string | undefined =
    body?.data?.transparent?.id ??
    body?.data?.pixQrCode?.id ??
    body?.data?.billing?.id ??
    body?.data?.id;

  // só nos interessam eventos de pagamento concluído
  // (v2: "transparent.completed"; formatos antigos usavam "*.paid")
  if (!chargeId || !(evento.includes("completed") || evento.includes("paid"))) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: pagamento } = await admin
    .from("pagamentos")
    .select("id, status, metodo, sessao_id, assinatura_id, usuario_id")
    .eq("abacatepay_charge_id", chargeId)
    .maybeSingle();

  if (!pagamento || pagamento.status === "pago") {
    return NextResponse.json({ received: true });
  }

  // não confia só no payload: confirma o status na API antes de liberar
  if (pagamento.metodo === "pix") {
    const confirmacao = await abacatepay.pixQrCode.check({ id: chargeId });
    if (confirmacao.error !== null || confirmacao.data.status !== "PAID") {
      return NextResponse.json({ received: true, ignored: "não confirmado na API" });
    }
  }

  const agora = new Date().toISOString();
  await admin
    .from("pagamentos")
    .update({ status: "pago", pago_em: agora })
    .eq("id", pagamento.id);

  if (pagamento.sessao_id) {
    // destrava a presença: confirmado_pendente_pagamento → confirmado
    await admin
      .from("presencas")
      .update({ status: "confirmado", pagamento_id: pagamento.id, confirmado_em: agora })
      .eq("sessao_id", pagamento.sessao_id)
      .eq("usuario_id", pagamento.usuario_id)
      .eq("status", "confirmado_pendente_pagamento");
  }

  if (pagamento.assinatura_id) {
    await admin
      .from("assinaturas")
      .update({ status: "ativa" })
      .eq("id", pagamento.assinatura_id);
  }

  return NextResponse.json({ received: true });
}
