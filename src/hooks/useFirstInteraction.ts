import { useEffect, useState } from "react";
let interacted = false;
export function useFirstInteraction() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (interacted) { setReady(true); return; }
    const events = ["pointerdown", "keydown", "touchstart", "wheel"] as const;
    const activate = () => {
      interacted = true;
      setReady(true);
      events.forEach(event => window.removeEventListener(event, activate));
    };
    events.forEach(event => window.addEventListener(event, activate, { passive: true }));
    return () => events.forEach(event => window.removeEventListener(event, activate));
  }, []);
  return ready;
}