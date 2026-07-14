"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { salvarPushSubscription } from "@/lib/supabase/push-actions";

type SubJson = { endpoint: string; keys: { p256dh: string; auth: string } };

function vapidKeyBytes(base64url: string) {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Sino no header: aparece só quando dá pra ativar push e ainda não está ativo.
// (iOS sem PWA instalado não tem PushManager — o banner de instalação cobre.)
export function PushBell() {
  const t = useTranslations("Push");
  const [pedir, setPedir] = useState(false);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window) ||
      Notification.permission === "denied" ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    )
      return;
    (async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        // re-sincroniza: outro login no mesmo navegador ou banco limpo
        await salvarPushSubscription(sub.toJSON() as SubJson);
      } else {
        setPedir(true);
      }
    })();
  }, []);

  if (!pedir) return null;

  async function ativar() {
    setPedir(false);
    if ((await Notification.requestPermission()) !== "granted") return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
    await salvarPushSubscription(sub.toJSON() as SubJson);
  }

  return (
    <button
      onClick={ativar}
      aria-label={t("ativar")}
      title={t("ativar")}
      className="rounded-md p-2 text-graphite-soft transition-colors hover:text-foreground dark:text-chalk/60 dark:hover:text-chalk"
    >
      <Bell className="size-4" aria-hidden />
    </button>
  );
}
