import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, GraduationCap, BookOpen, MapPin, Tag, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Suggestion = {
  type: "institute" | "exam" | "city" | "category" | "college";
  label: string;
  sub: string;
  link: string;
};

const iconMap = {
  institute: GraduationCap,
  exam: BookOpen,
  city: MapPin,
  category: Tag,
  college: Building2,
};

const SmartSearch = ({ className = "", onClose }: { className?: string; onClose?: () => void }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }

    const q = query.toLowerCase();
    const controller = new AbortController();

    const fetchResults = async () => {
      const suggestions: Suggestion[] = [];

      const [instRes, examRes, catRes, collegeRes] = await Promise.all([
        supabase.from("institutes").select("name, slug, city, rating").ilike("name", `%${q}%`).limit(5),
        supabase.from("exams").select("name, slug, full_name, conducting_body").ilike("name", `%${q}%`).limit(5),
        supabase.from("categories").select("name, slug, description").ilike("name", `%${q}%`).limit(4),
        supabase.from("colleges").select("name, slug, city, ranking, fees").ilike("name", `%${q}%`).limit(5),
      ]);

      instRes.data?.forEach((i) =>
        suggestions.push({ type: "institute", label: i.name, sub: `${i.city || ""} · ${i.rating || 0}★`, link: `/institute/${i.slug}` })
      );
      examRes.data?.forEach((e) =>
        suggestions.push({ type: "exam", label: `${e.name}${e.full_name ? ` — ${e.full_name}` : ""}`, sub: e.conducting_body || "", link: `/exam/${e.slug}` })
      );
      catRes.data?.forEach((c) =>
        suggestions.push({ type: "category", label: c.name, sub: c.description || "", link: `/category/${c.slug}` })
      );
      collegeRes.data?.forEach((c) =>
        suggestions.push({ type: "college", label: c.name, sub: `${c.city || ""} · Rank #${c.ranking || "—"} · ${c.fees || ""}`, link: `/college/${c.slug}` })
      );

      if (!controller.signal.aborted) {
        setResults(suggestions.slice(0, 10));
        setOpen(suggestions.length > 0);
        setSelectedIdx(-1);
      }
    };

    const timer = setTimeout(fetchResults, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: Suggestion) => {
    navigate(s.link);
    setQuery("");
    setOpen(false);
    onClose?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, 0)); }
    if (e.key === "Enter" && selectedIdx >= 0) { handleSelect(results[selectedIdx]); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
      <Input
        placeholder="Search coaching, exams, colleges..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="pl-9 h-9 text-sm bg-muted border-none rounded-xl"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto animate-fade-in">
          <div className="px-3 py-2 border-b border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Results</span>
          </div>
          {results.map((s, i) => {
            const Icon = iconMap[s.type];
            return (
              <button
                key={`${s.type}-${s.label}-${i}`}
                onClick={() => handleSelect(s)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/20 last:border-b-0 ${selectedIdx === i ? "bg-primary/10" : "hover:bg-muted/60"}`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{s.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.sub}</div>
                </div>
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full capitalize flex-shrink-0">{s.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
