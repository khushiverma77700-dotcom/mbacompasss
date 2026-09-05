// Client-side helpers for browser notifications.

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { registerPushToken } from "@/lib/push.functions";

const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as
  | string
  | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as
  | string
  | undefined;

const firebaseConfig = {
  apiKey: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as
    | string
    | undefined,
  projectId: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as
    | string
    | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushStatus =
  | "registered"
  | "already-on"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "failed";

export const pushConfigured = (): boolean =>
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!appId && !!vapidKey &&
  !!firebaseConfig.messagingSenderId;

export const pushPermission = (): NotificationPermission | "unavailable" => {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return Notification.permission;
};

/** Ask the browser for permission and store the device so admins can reach it. */
export async function enablePush(userId: string | null): Promise<PushStatus> {
  if (!pushConfigured()) return "not-configured";
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (!(await isSupported())) return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const query = new URLSearchParams({
      apiKey: firebaseConfig.apiKey ?? "",
      projectId: firebaseConfig.projectId ?? "",
      appId: appId ?? "",
      messagingSenderId: firebaseConfig.messagingSenderId,
    }).toString();
    const serviceWorkerRegistration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${query}`,
    );
    const app = getApps()[0] ?? initializeApp({
      apiKey: firebaseConfig.apiKey ?? "",
      projectId: firebaseConfig.projectId ?? "",
      appId: appId ?? "",
      messagingSenderId: firebaseConfig.messagingSenderId,
    });
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
    if (!token) return "denied";
    await registerPushToken({
      data: {
        token,
        userId,
        userAgent: navigator.userAgent.slice(0, 400),
        pagePath: window.location.pathname.slice(0, 300),
      },
    });
    return "registered";
  } catch {
    return "failed";
  }
}
