import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
} from "@block65/webcrypto-web-push";

export type PushSubRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Envia a notificação pra cada subscription e retorna os endpoints mortos
// (404/410) pro chamador limpar do banco. Sem VAPID configurado vira no-op.
export async function enviarPush(
  subs: PushSubRow[],
  data: { title: string; link: string },
): Promise<string[]> {
  const vapid = {
    subject: process.env.VAPID_SUBJECT ?? "",
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  };
  if (!vapid.publicKey || !vapid.privateKey || subs.length === 0) return [];

  const message: PushMessage = { data, options: { ttl: 60 * 60 * 24 } };
  const mortos: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const subscription: PushSubscription = {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        const payload = await buildPushPayload(message, subscription, vapid);
        // o TS do projeto tipa Uint8Array<ArrayBufferLike> ≠ BodyInit; em runtime é válido
        const res = await fetch(sub.endpoint, { ...payload, body: payload.body as BodyInit });
        if (res.status === 404 || res.status === 410) mortos.push(sub.endpoint);
      } catch (e) {
        // push é melhor-esforço: nunca derruba a ação que o disparou
        console.error("push falhou:", sub.endpoint, e);
      }
    }),
  );

  return mortos;
}
