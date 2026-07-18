import { useEffect, useState } from "react";
import { Newspaper, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

type NewsItem = { tag: string; text: string; href: string; start_at?: string | null; end_at?: string | null };

const FALLBACK: NewsItem[] = [
  { tag: "CAT 2026", text: "IIM Kozhikode releases official CAT 2026 notification & exam calendar", href: "/exam/cat" },
  { tag: "XAT 2026", text: "XLRI opens XAT 2026 registrations — key dates and syllabus changes", href: "/exam/xat" },
  { tag: "IIM-A", text: "IIM Ahmedabad PGP 2026-28 shortlist criteria & Academic Rating weightage", href: "/college/iim-ahmedabad" },
  { tag: "Placements", text: "ISB Hyderabad Class of 2025 posts highest median CTC of ₹36.5 LPA", href: "/college/isb-hyderabad" },
  { tag: "SNAP", text: "Symbiosis announces 3-slot SNAP 2026 with revised marking scheme", href: "/exam/snap" },
  { tag: "NMAT", text: "NMIMS opens NMAT by GMAC 2026 registrations — 75-day testing window", href: "/exam/nmat" },
];

const isActive = (it: NewsItem, now = Date.now()): boolean => {
  const start = it.start_at ? Date.parse(it.start_at) : NaN;
  const end = it.end_at ? Date.parse(it.end_at) : NaN;
  if (!isNaN(start) && now < start) return false;
  if (!isNaN(end) && now > end) return false;
  return true;
};


type Props = {
  items?: NewsItem[];
  enabled?: boolean;
  fetchRemote?: boolean;
};

const MBANewsBar = ({ items: itemsProp, enabled: enabledProp, fetchRemote = true }: Props = {}) => {
  const [items, setItems] = useState<NewsItem[]>(
    itemsProp && itemsProp.length ? itemsProp.filter(isActive) : FALLBACK
  );
  const [enabled, setEnabled] = useState(enabledProp ?? true);

  useEffect(() => {
    if (itemsProp) {
      const valid = itemsProp.filter((it) => it?.text && it?.href).filter(isActive);
      setItems(valid);
    }
    if (typeof enabledProp === "boolean") setEnabled(enabledProp);
  }, [itemsProp, enabledProp]);

  useEffect(() => {
    if (!fetchRemote) return;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mba_newsroom_bar")
        .maybeSingle();
      const v: any = data?.value;
      if (v) {
        if (v.enabled === false) setEnabled(false);
        if (Array.isArray(v.items) && v.items.length) {
          setItems(v.items.filter((it: any) => it?.text && it?.href).filter(isActive));
        }
      }
    })();
  }, [fetchRemote]);


  if (!enabled || items.length === 0) return null;
  const loop = [...items, ...items];


  return (
    <div className="relative border-y border-primary/15 bg-gradient-to-r from-sky-50 via-white to-sky-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 md:gap-4 py-2">
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0 pr-2 md:pr-4 border-r border-primary/15" aria-label="MBA Newsroom">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <Newspaper className="w-4 h-4 text-primary" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-primary">
              <span className="md:hidden">News</span>
              <span className="hidden md:inline">MBA Newsroom</span>
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative min-w-0">
            <div className="flex gap-6 md:gap-10 whitespace-nowrap animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused]">
              {loop.map((n, i) => {
                const isExternal = /^https?:\/\//i.test(n.href);
                const content = (
                  <>
                    {n.tag && (
                      <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 rounded">
                        {n.tag}
                      </span>
                    )}
                    <span className="font-medium whitespace-nowrap">{n.text}</span>
                    <ArrowRight className="w-3 h-3 opacity-60 flex-shrink-0" />
                  </>
                );
                const cls = "inline-flex items-center gap-2 shrink-0 whitespace-nowrap text-xs md:text-sm text-foreground/80 hover:text-primary transition-colors";
                return isExternal ? (
                  <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>
                ) : (
                  <Link key={i} to={n.href} className={cls}>{content}</Link>
                );
              })}
            </div>

            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 md:w-8 bg-gradient-to-r from-sky-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 md:w-8 bg-gradient-to-l from-sky-50 to-transparent" />
          </div>
        </div>
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
};

export default MBANewsBar;
