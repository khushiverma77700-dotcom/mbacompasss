import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, GraduationCap, BookOpen, MapPin, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { institutes, categories, cities, mbaColleges, examDetails } from "@/data/mockData";

type Suggestion = {
  type: "institute" | "exam" | "city" | "category" | "college";
  label: string;
  sub: string;
  link: string;
};

const allSuggestions: Suggestion[] = [
  ...institutes.map((i) => ({
    type: "institute" as const,
    label: i.name,
    sub: `${i.city} · ${i.rating}★ · ${i.fees}`,
    link: `/institute/${i.slug}`,
  })),
  ...examDetails.map((e) => ({
    type: "exam" as const,
    label: `${e.name} — ${e.fullName}`,
    sub: e.conductedBy,
    link: `/exam/${e.slug}`,
  })),
  ...categories.map((c) => ({
    type: "category" as const,
    label: c.name,
    sub: c.description,
    link: `/category/${c.slug}`,
  })),
  ...cities.map((c) => ({
    type: "city" as const,
    label: `MBA Coaching in ${c}`,
    sub: `${institutes.filter((i) => i.city === c).length} institutes`,
    link: `/category/cat?q=${c}`,
  })),
  ...mbaColleges.slice(0, 10).map((c) => ({
    type: "college" as const,
    label: c.name,
    sub: `${c.city} · Rank #${c.ranking} · ${c.fees}`,
    link: `/colleges`,
  })),
];

const iconMap = {
  institute: GraduationCap,
  exam: BookOpen,
  city: MapPin,
  category: Tag,
  college: GraduationCap,
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
    const matched = allSuggestions
      .filter((s) => s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q))
      .slice(0, 8);
    setResults(matched);
    setOpen(matched.length > 0);
    setSelectedIdx(-1);
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
        placeholder="Search coaching, exams, cities..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="pl-9 h-9 text-sm bg-muted border-none"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
          {results.map((s, i) => {
            const Icon = iconMap[s.type];
            return (
              <button
                key={`${s.type}-${s.label}-${i}`}
                onClick={() => handleSelect(s)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors ${selectedIdx === i ? "bg-muted/50" : ""}`}
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">{s.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.sub}</div>
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize flex-shrink-0">{s.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SmartSearch;
