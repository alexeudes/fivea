import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { abacatepay } from "@/lib/abacatepay/client";

// DEV ONLY: simula o pagamento de uma cobrança Pix (modo dev do AbacatePay
// ou mock local). Necessário porque o webhook real não alcança localhost.
// Fluxo de teste: criar cobrança → POST aqui → POST no webhook.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const pagamentoId: string | undefined = body.pagamento_id;
  if (!pagamentoId) {
    return NextResponse.json({ error: "pagamento_id obrigatório" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: pagamento } = await admin
    .from("pagamentos")
    .select("abacatepay_charge_id")
    .eq("id", pagamentoId)
    .maybeSingle();
  if (!pagamento?.abacatepay_charge_id) {
    return NextResponse.json({ error: "pagamento não encontrado" }, { status: 404 });
  }

  const resposta = await abacatepay.pixQrCode.simulatePayment({
    id: pagamento.abacatepay_charge_id,
  });
  if (resposta.error !== null) {
    return NextResponse.json({ error: resposta.error }, { status: 502 });
  }
  return NextResponse.json({ charge_id: pagamento.abacatepay_charge_id, status: resposta.data.status });
}
