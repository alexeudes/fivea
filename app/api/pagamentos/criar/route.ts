import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { abacatepay } from "@/lib/abacatepay/client";

// Cria uma cobrança no AbacatePay e registra em `pagamentos` (via
// service_role — RLS bloqueia escrita direta do client, por design).
// Body: { sessao_id?: string, assinatura_id?: string, metodo?: "pix" | "cartao" }
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessaoId: string | undefined = body.sessao_id;
  const assinaturaId: string | undefined = body.assinatura_id;
  const metodo: string = body.metodo ?? "pix";

  if (!sessaoId === !assinaturaId) {
    return NextResponse.json(
      { error: "Informe sessao_id ou assinatura_id (exatamente um)." },
      { status: 400 },
    );
  }

  // client do usuário: autentica e valida acesso via RLS de leitura
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let valor: number | null = null;
  let descricao = "";

  if (sessaoId) {
    const { data: sessao } = await supabase
      .from("sessoes_pelada")
      .select("id, grupo:grupos_pelada(nome, valor_diaria)")
      .eq("id", sessaoId)
      .returns<{ id: string; grupo: { nome: string; valor_diaria: number | null } }[]>()
      .single();
    if (!sessao) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }
    valor = sessao.grupo.valor_diaria;
    descricao = `Fivea — diária: ${sessao.grupo.nome}`;
  } else {
    const { data: assinatura } = await supabase
      .from("assinaturas")
      .select("id, usuario_id, grupo:grupos_pelada(nome, valor_mensalidade)")
      .eq("id", assinaturaId!)
      .returns<
        { id: string; usuario_id: string; grupo: { nome: string; valor_mensalidade: number | null } }[]
      >()
      .single();
    if (!assinatura || assinatura.usuario_id !== user.id) {
      return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 });
    }
    valor = assinatura.grupo.valor_mensalidade;
    descricao = `Fivea — mensalidade: ${assinatura.grupo.nome}`;
  }

  if (!valor || valor <= 0) {
    return NextResponse.json(
      { error: "Grupo sem valor de cobrança configurado." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // reusa cobrança pendente existente em vez de gerar outra
  const { data: existente } = await admin
    .from("pagamentos")
    .select("id, qr_code, status")
    .eq("usuario_id", user.id)
    .eq(sessaoId ? "sessao_id" : "assinatura_id", sessaoId ?? assinaturaId!)
    .eq("status", "pendente")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existente?.qr_code) {
    return NextResponse.json({
      pagamento_id: existente.id,
      br_code: existente.qr_code,
      br_code_base64: null,
    });
  }

  const centavos = Math.round(Number(valor) * 100);
  const pagamentoId = crypto.randomUUID();

  if (metodo !== "pix") {
    // ponytail: SDK 1.6 do AbacatePay só suporta Pix de verdade (billing
    // exige customerId e a doc diz "apenas PIX é suportado") — ver
    // PENDENCIAS.md. Ligar cartão aqui quando o SDK suportar.
    return NextResponse.json(
      { error: "Método não suportado — apenas Pix por enquanto." },
      { status: 400 },
    );
  }

  const resposta = await abacatepay.pixQrCode.create({
    amount: centavos,
    expiresIn: 3600,
    description: descricao,
  });
  if (resposta.error !== null) {
    return NextResponse.json({ error: resposta.error }, { status: 502 });
  }

  const { error } = await admin.from("pagamentos").insert({
    id: pagamentoId,
    sessao_id: sessaoId ?? null,
    assinatura_id: assinaturaId ?? null,
    usuario_id: user.id,
    metodo: "pix",
    valor,
    abacatepay_charge_id: resposta.data.id,
    qr_code: resposta.data.brCode,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    pagamento_id: pagamentoId,
    br_code: resposta.data.brCode,
    br_code_base64: resposta.data.brCodeBase64,
  });
}
