import { Lock, ShoppingBag } from "lucide-react";

/**
 * Frosted-glass lock overlay shown over premium content in /demo mode.
 * The CTA inside is marked `data-demo-allow="true"` so it slips past the
 * DemoShell click interceptor and routes to /mba-compass.
 */
export default function DemoLockedOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/40 backdrop-blur-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-4 ring-white/60">
        <Lock className="h-4 w-4" />
      </div>
      <a
        data-demo-allow="true"
        href="/mba-compass"
        className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-md hover:shadow-lg"
      >
        <ShoppingBag className="h-3 w-3" /> Unlock Full Access
      </a>
    </div>
  );
}
