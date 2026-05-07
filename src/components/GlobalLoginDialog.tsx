import { useEffect, useState } from "react";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";

/**
 * Mounts once at the app root. Listens for window 'open-login-dialog'
 * events fired by useCtaGate / openLoginDialog so any CTA can request login.
 */
const GlobalLoginDialog = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      setMessage(detail.message);
      setOpen(true);
    };
    window.addEventListener("open-login-dialog", handler as EventListener);
    return () => window.removeEventListener("open-login-dialog", handler as EventListener);
  }, []);

  return <LoginRequiredDialog open={open} onOpenChange={setOpen} message={message} />;
};

export default GlobalLoginDialog;
