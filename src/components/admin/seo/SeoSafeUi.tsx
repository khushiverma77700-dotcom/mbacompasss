// Shared safety UI for the admin SEO suite:
//   * SafeValue        — renders any database value as valid React text
//   * ValidationNotice — names the exact malformed field from the backend
//   * RawPayloadDrawer — "View raw payload" debug drawer per widget
//   * LiveDot / Scanline — the animated "system is working" primitives

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Bug } from "lucide-react";
import { safeJson, safeText, type ValidationResult } from "@/lib/seoSafeRender";

export { safeText, safeJson } from "@/lib/seoSafeRender";

export const SafeValue = ({ value, fallback = "—" }: { value: unknown; fallback?: string }) => (
  <>{safeText(value, fallback)}</>
);

/** Blinking status dot — tone drives colour, `live` drives the pulse. */
export const LiveDot = ({
  live = true,
  tone = "emerald",
  className = "",
}: { live?: boolean; tone?: "emerald" | "sky" | "amber" | "red" | "muted"; className?: string }) => {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    muted: "bg-muted-foreground/50",
  };
  return (
    <span className={`relative inline-flex h-2.5 w-2.5 ${className}`}>
      {live && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${map[tone]}`} />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${map[tone]}`} />
    </span>
  );
};

/** Thin scanning bar shown while a widget is fetching/processing. */
export const Scanline = ({ active }: { active: boolean }) => (
  <div className="h-0.5 w-full overflow-hidden rounded-full bg-sky-100">
    {active && <div className="h-full w-1/3 animate-[seo-scan_1.4s_ease-in-out_infinite] rounded-full bg-sky-500" />}
  </div>
);

export const ValidationNotice = ({ result, source }: { result: ValidationResult; source: string }) => {
  if (result.ok) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-3.5 w-3.5" />
        {source}: {result.issues.length} field(s) came back in an unexpected shape
      </div>
      <ul className="mt-2 space-y-1">
        {result.issues.map((i, idx) => (
          <li key={idx} className="font-mono">
            <span className="font-semibold">{i.field}</span> — expected {i.expected}, got {i.received}
            {i.reason === "missing" ? " (missing)" : ""}
            {i.sample && i.sample !== "(absent)" ? ` → ${i.sample}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const RawPayloadDrawer = ({
  title,
  payload,
  validation,
  label = "View raw payload",
}: {
  title: string;
  payload: unknown;
  validation?: ValidationResult;
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const bad = validation && !validation.ok;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
          <Bug className="h-3.5 w-3.5" />
          {label}
          {bad && <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">{validation!.issues.length}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{safeText(title, "Raw payload")}</SheetTitle>
          <SheetDescription>Exact data returned by the API for this widget.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {validation && <ValidationNotice result={validation} source="Schema check" />}
          <ScrollArea className="h-[70vh] rounded-md border bg-muted/30">
            <pre className="p-3 text-xs leading-relaxed">{safeJson(payload)}</pre>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
