// Server-only: never import this from a Client Component.
//
// Wrapper REST fino da API v2 do AbacatePay (Checkout Transparente PIX).
// O SDK oficial npm (abacatepay-nodejs-sdk 1.6) ainda aponta pra API v1,
// que rejeita chaves novas com "API key version mismatch" — por isso REST
// direto. Interface espelha o que as rotas usam: create/check/simulatePayment.
//
// Sem ABACATEPAY_API_KEY definida, exporta um mock em memória pra dar pra
// rodar o fluxo completo de pagamento em dev/testes sem conta no AbacatePay.

const BASE_URL = "https://api.abacatepay.com/v2";

type PixData = {
  id: string;
  amount: number;
  status: "PENDING" | "EXPIRED" | "CANCELLED" | "PAID" | "REFUNDED";
  brCode: string;
  brCodeBase64: string;
  devMode: boolean;
};
type PixResponse = { error: string; data?: never } | { error: null; data: PixData };

async function api(path: string, init?: RequestInit): Promise<PixResponse> {
  const resposta = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const corpo = await resposta.json().catch(() => null);
  if (!corpo?.success) return { error: corpo?.error ?? `HTTP ${resposta.status}` };
  return { error: null, data: corpo.data };
}

const real = {
  pixQrCode: {
    create(dados: { amount: number; expiresIn: number; description: string }) {
      return api("/transparents/create", {
        method: "POST",
        body: JSON.stringify({ method: "PIX", data: dados }),
      });
    },
    check({ id }: { id: string }) {
      return api(`/transparents/check?id=${encodeURIComponent(id)}`);
    },
    simulatePayment({ id }: { id: string }) {
      return api(`/transparents/simulate-payment?id=${encodeURIComponent(id)}`, {
        method: "POST",
        body: "{}",
      });
    },
  },
};

// ---- mock em memória (sem chave) ----

const mockPix = new Map<string, PixData>();

// 1x1 px transparente — só pra UI ter uma imagem pra mostrar no mock
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const mock: typeof real = {
  pixQrCode: {
    async create(dados) {
      const pix: PixData = {
        id: `pix_char_mock_${crypto.randomUUID().slice(0, 8)}`,
        amount: dados.amount,
        status: "PENDING",
        brCode: `00020126MOCK${crypto.randomUUID()}5204000053039865802BR`,
        brCodeBase64: PIXEL,
        devMode: true,
      };
      mockPix.set(pix.id, pix);
      return { error: null, data: pix };
    },
    async check({ id }) {
      const pix = mockPix.get(id);
      return pix ? { error: null, data: pix } : { error: "not found" };
    },
    async simulatePayment({ id }) {
      const pix = mockPix.get(id);
      if (!pix) return { error: "not found" };
      pix.status = "PAID";
      return { error: null, data: pix };
    },
  },
};

export const abacatepayMockAtivo = !process.env.ABACATEPAY_API_KEY;

export const abacatepay = abacatepayMockAtivo ? mock : real;
