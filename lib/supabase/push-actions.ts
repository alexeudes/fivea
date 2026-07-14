"use server";

import { createClient } from "@/lib/supabase/server";

// Salva/atualiza a subscription deste navegador (JSON de PushSubscription.toJSON()).
export async function salvarPushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("push_subscriptions").upsert(
    {
      usuario_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" },
  );
}
