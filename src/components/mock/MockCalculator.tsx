import { useEffect, useRef, useState } from "react";
import { Calculator as CalcIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating, draggable on-screen calculator for the CAT mock interface.
 * Lives inside the fullscreen test container so it doesn't trigger
 * fullscreen-exit anti-cheat events.
 */
export default function MockCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Keep within viewport on resize
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clamp = (p: { x: number; y: number }) => {
    const w = 260;
    const h = 360;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return { x: Math.min(Math.max(8 - window.innerWidth + w, p.x), 0), y: Math.min(Math.max(0, p.y), Math.max(0, maxY - 60)) };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: pos.x, oy: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const press = (val: string) => {
    if (val === "C") {
      setExpr("");
      setDisplay("0");
      return;
    }
    if (val === "←") {
      const next = expr.slice(0, -1);
      setExpr(next);
      setDisplay(next || "0");
      return;
    }
    if (val === "=") {
      try {
        // Safe-ish eval: only allow digits, operators, parens, dot
        if (!/^[0-9+\-*/().\s%]*$/.test(expr)) throw new Error("bad");
        // eslint-disable-next-line no-new-func
        const r = Function(`"use strict"; return (${expr.replace(/%/g, "/100")})`)();
        const out = Number.isFinite(r) ? String(+(+r).toFixed(8)) : "Error";
        setDisplay(out);
        setExpr(String(out));
      } catch {
        setDisplay("Error");
        setExpr("");
      }
      return;
    }
    const next = (expr === "0" || display === "Error" ? "" : expr) + val;
    setExpr(next);
    setDisplay(next);
  };

  const keys = [
    "C", "(", ")", "←",
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "%", "+",
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded bg-white/10 hover:bg-white/20 px-2 py-1 text-xs font-medium text-white"
        aria-label="Calculator"
      >
        <CalcIcon className="h-4 w-4" />
        <span className="hidden sm:inline">Calculator</span>
      </button>

      {open && (
        <div
          className="fixed z-[60] w-[260px] rounded-lg shadow-2xl border border-slate-300 bg-white"
          style={{
            top: `calc(56px + ${pos.y}px)`,
            right: `calc(8px - ${pos.x}px)`,
          }}
        >
          <div
            onMouseDown={onMouseDown}
            className="flex items-center justify-between bg-slate-900 text-white px-3 py-2 rounded-t-lg cursor-move select-none"
          >
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <CalcIcon className="h-3.5 w-3.5" /> Calculator
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Close calculator"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3">
            <div className="bg-slate-50 border rounded px-3 py-2 mb-3 text-right font-mono text-lg min-h-[40px] truncate">
              {display}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {keys.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  className={cn(
                    "h-9 rounded text-sm font-semibold border transition",
                    /[0-9.]/.test(k) && "bg-white hover:bg-slate-50 border-slate-300",
                    /[+\-*/%()]/.test(k) && "bg-slate-100 hover:bg-slate-200 border-slate-300",
                    (k === "C" || k === "←") && "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700",
                  )}
                >
                  {k}
                </button>
              ))}
              <button
                type="button"
                onClick={() => press("=")}
                className="col-span-4 h-9 rounded text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white"
              >
                =
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
