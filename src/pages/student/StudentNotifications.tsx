import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell, BellRing, CheckCheck, Sparkles, ExternalLink, Inbox, Megaphone,
  GraduationCap, AlertCircle, Info, Clock, Search, Filter, Pin, PinOff,
  Trash2, Copy, Check, ArrowDown, Layers, Activity, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface N {
  id: string;
  title: string;
  message: string | null;
  type: string;
  link_url: string | null;
  link_label: string | null;
  image_url: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_META: Record<string, { icon: any; tone: string; label: string }> = {
  info:    { icon: Info,           tone: "sky",     label: "Update" },
  success: { icon: CheckCheck,     tone: "emerald", label: "Good news" },
  alert:   { icon: AlertCircle,    tone: "rose",    label: "Important" },
  mock:    { icon: GraduationCap,  tone: "violet",  label: "New Mock" },
  exam:    { icon: Megaphone,      tone: "amber",   label: "Exam Update" },
  college: { icon: GraduationCap,  tone: "blue",    label: "College Update" },
};

const TONE: Record<string, { ring: string; bg: string; text: string; dot: string; chip: string; gradient: string; border: string }> = {
  sky:     { ring: "ring-sky-200/70 dark:ring-sky-500/30",         bg: "bg-sky-50 dark:bg-sky-500/10",         text: "text-sky-700 dark:text-sky-300",         dot: "bg-sky-500",     chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",            gradient: "from-sky-500/10 via-sky-500/5 to-transparent",        border: "border-l-sky-500" },
  emerald: { ring: "ring-emerald-200/70 dark:ring-emerald-500/30", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200", gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent", border: "border-l-emerald-500" },
  rose:    { ring: "ring-rose-200/70 dark:ring-rose-500/30",       bg: "bg-rose-50 dark:bg-rose-500/10",       text: "text-rose-700 dark:text-rose-300",       dot: "bg-rose-500",    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",         gradient: "from-rose-500/10 via-rose-500/5 to-transparent",       border: "border-l-rose-500" },
  violet:  { ring: "ring-violet-200/70 dark:ring-violet-500/30",   bg: "bg-violet-50 dark:bg-violet-500/10",   text: "text-violet-700 dark:text-violet-300",   dot: "bg-violet-500",  chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",  gradient: "from-violet-500/10 via-violet-500/5 to-transparent",   border: "border-l-violet-500" },
  amber:   { ring: "ring-amber-200/70 dark:ring-amber-500/30",     bg: "bg-amber-50 dark:bg-amber-500/10",     text: "text-amber-700 dark:text-amber-300",     dot: "bg-amber-500",   chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",      gradient: "from-amber-500/10 via-amber-500/5 to-transparent",     border: "border-l-amber-500" },
  blue:    { ring: "ring-blue-200/70 dark:ring-blue-500/30",       bg: "bg-blue-50 dark:bg-blue-500/10",       text: "text-blue-700 dark:text-blue-300",       dot: "bg-blue-500",    chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",          gradient: "from-blue-500/10 via-blue-500/5 to-transparent",       border: "border-l-blue-500" },
};

const TYPE_FILTERS = [
  { key: "all",     label: "All",         icon: Layers },
  { key: "mock",    label: "Mocks",       icon: GraduationCap },
  { key: "exam",    label: "Exams",       icon: Megaphone },
  { key: "alert",   label: "Important",   icon: AlertCircle },
  { key: "info",    label: "Updates",     icon: Info },
  { key: "success", label: "Good news",   icon: CheckCheck },
  { key: "college", label: "Colleges",    icon: GraduationCap },
];

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function groupByDay(items: N[]) {
  const groups: { label: string; items: N[] }[] = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const week = new Date(today); week.setDate(today.getDate() - 7);

  const buckets = { Today: [] as N[], Yesterday: [] as N[], "This week": [] as N[], Earlier: [] as N[] };
  for (const n of items) {
    const d = new Date(n.created_at); d.setHours(0,0,0,0);
    if (+d === +today) buckets.Today.push(n);
    else if (+d === +yest) buckets.Yesterday.push(n);
    else if (d > week) buckets["This week"].push(n);
    else buckets.Earlier.push(n);
  }
  for (const [label, arr] of Object.entries(buckets)) if (arr.length) groups.push({ label, items: arr });
  return groups;
}

export default function StudentNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("notif_pinned") ?? "[]")); }
    catch { return new Set(); }
  });
  const [showJump, setShowJump] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [livePulse, setLivePulse] = useState(false);

  const persistPins = (s: Set<string>) => {
    setPinned(new Set(s));
    localStorage.setItem("notif_pinned", JSON.stringify([...s]));
  };

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("student_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300);
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: prepend new notifications and pulse the live indicator
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifications-feed-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "student_notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => [payload.new as any, ...prev]);
          setLivePulse(true);
          setTimeout(() => setLivePulse(false), 2000);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "student_notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => setItems((prev) => prev.filter(i => i.id !== payload.old.id))
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Auto-mark read shortly after opening
  useEffect(() => {
    if (!user || loading) return;
    const unread = items.filter(i => !i.is_read).map(i => i.id);
    if (!unread.length) return;
    const t = setTimeout(async () => {
      await supabase.from("student_notifications").update({ is_read: true }).in("id", unread);
      setItems((prev) => prev.map(i => unread.includes(i.id) ? { ...i, is_read: true } : i));
    }, 1500);
    return () => clearTimeout(t);
  }, [loading, items, user]);

  // Show "scroll to top" jumper after scrolling
  useEffect(() => {
    const onScroll = () => setShowJump(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("student_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems(prev => prev.map(i => ({ ...i, is_read: true })));
    toast.success("All updates marked as read");
  };

  const togglePin = (id: string) => {
    const s = new Set(pinned);
    s.has(id) ? s.delete(id) : s.add(id);
    persistPins(s);
  };

  const dismiss = async (id: string) => {
    await supabase.from("student_notifications").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (pinned.has(id)) { const s = new Set(pinned); s.delete(id); persistPins(s); }
    toast.success("Update dismissed");
  };

  const copyLink = async (n: N) => {
    if (!n.link_url) return;
    const url = n.link_url.startsWith("http") ? n.link_url : `${window.location.origin}${n.link_url}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(n.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Filtering pipeline
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      if (filter === "unread" && i.is_read) return false;
      if (filter === "read" && !i.is_read) return false;
      if (typeFilter !== "all" && i.type !== typeFilter) return false;
      if (q && !(i.title?.toLowerCase().includes(q) || i.message?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, filter, typeFilter, search]);

  const pinnedItems = useMemo(() => filtered.filter(i => pinned.has(i.id)), [filtered, pinned]);
  const unpinnedItems = useMemo(() => filtered.filter(i => !pinned.has(i.id)), [filtered, pinned]);
  const groups = useMemo(() => groupByDay(unpinnedItems), [unpinnedItems]);

  // KPI counts
  const kpi = useMemo(() => {
    const today0 = new Date(); today0.setHours(0,0,0,0);
    const week0 = new Date(today0); week0.setDate(week0.getDate() - 7);
    return {
      total: items.length,
      unread: items.filter(i => !i.is_read).length,
      today: items.filter(i => new Date(i.created_at) >= today0).length,
      week:  items.filter(i => new Date(i.created_at) >= week0).length,
    };
  }, [items]);

  // Per-type counts for filter chip badges
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = { all: items.length };
    for (const i of items) m[i.type] = (m[i.type] ?? 0) + 1;
    return m;
  }, [items]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 dark:border-sky-500/20 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-500/10 dark:via-background dark:to-blue-500/5 p-5 sm:p-7">
        <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-sky-200/40 dark:bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-10 h-40 w-40 rounded-full bg-blue-200/40 dark:bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg shadow-sky-500/25 relative">
                <BellRing className="h-5 w-5" />
                {kpi.unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-white dark:ring-background">
                    {kpi.unread > 99 ? "99+" : kpi.unread}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Updates Timeline</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className={cn("inline-flex items-center gap-1", livePulse && "text-emerald-600")}>
                    <span className="relative flex h-2 w-2">
                      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", livePulse ? "animate-ping bg-emerald-400" : "bg-emerald-400")} />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live
                  </span>
                  <span>·</span>
                  <span>All product updates, mocks and exam alerts in one feed</span>
                </p>
              </div>
            </div>

            {/* KPI strip */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl">
              <Stat label="Total"   value={kpi.total}  tone="sky"     icon={Layers} />
              <Stat label="Unread"  value={kpi.unread} tone="rose"    icon={Sparkles} highlight={kpi.unread > 0} />
              <Stat label="Today"   value={kpi.today}  tone="emerald" icon={Activity} />
              <Stat label="7 days"  value={kpi.week}   tone="violet"  icon={Clock} />
            </div>
          </div>

          {/* Right: read controls */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-sky-100 dark:border-sky-500/20 bg-white/80 dark:bg-card/60 p-1">
              {(["all","unread","read"] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition capitalize",
                    filter === k ? "bg-sky-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {k} {k === "unread" && kpi.unread > 0 && `(${kpi.unread})`}
                </button>
              ))}
            </div>
            {kpi.unread > 0 && (
              <Button variant="outline" size="sm" onClick={markAll}>
                <CheckCheck className="h-4 w-4 mr-1" /> Mark all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Search + type chips ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search updates by title or message…"
            className="pl-9 pr-9 bg-card border-sky-100 dark:border-sky-500/20 focus-visible:ring-sky-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {TYPE_FILTERS.map(t => {
            const active = typeFilter === t.key;
            const count = typeCounts[t.key] ?? 0;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTypeFilter(t.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0",
                  active
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent shadow-sm"
                    : "bg-card border-sky-100 dark:border-sky-500/20 text-foreground/80 hover:border-sky-300 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                <span className={cn(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold grid place-items-center",
                  active ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                )}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex gap-4">
              <div className="h-10 w-10 rounded-xl bg-muted/40 animate-pulse shrink-0" />
              <div className="flex-1 h-28 rounded-xl bg-muted/40 animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-sky-100 dark:border-sky-500/20">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-sky-50 dark:bg-sky-500/10 grid place-items-center mb-4">
            <Inbox className="h-8 w-8 text-sky-400" />
          </div>
          <div className="font-semibold text-lg">
            {items.length === 0 ? "You're all caught up" : "No updates match your filters"}
          </div>
          <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {items.length === 0
              ? "New mock launches, exam alerts and announcements from your mentors will appear here."
              : "Try clearing the search or switching to a different category."}
          </div>
          {items.length > 0 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(""); setFilter("all"); setTypeFilter("all"); }}>
              Clear filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-sky-300 via-sky-100 to-transparent dark:from-sky-500/40 dark:via-sky-500/10" />

          {/* Pinned section */}
          {pinnedItems.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 ml-12">
                <Pin className="h-3.5 w-3.5 text-amber-500" />
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300">Pinned</div>
                <div className="h-px flex-1 bg-amber-200/50 dark:bg-amber-500/20" />
                <span className="text-[11px] text-muted-foreground">{pinnedItems.length}</span>
              </div>
              <div className="space-y-4">
                {pinnedItems.map((n, idx) => (
                  <TimelineCard
                    key={n.id} n={n} idx={idx} pinned
                    onPin={togglePin} onDismiss={dismiss} onCopy={copyLink} copiedId={copiedId}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Day groups */}
          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="sticky top-14 z-10 -mx-1 px-1 py-1 backdrop-blur bg-background/70">
                  <div className="flex items-center gap-2 ml-12">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[11px] text-muted-foreground">{g.items.length}</span>
                  </div>
                </div>
                <div className="space-y-4 mt-3">
                  {g.items.map((n, idx) => (
                    <TimelineCard
                      key={n.id} n={n} idx={idx}
                      onPin={togglePin} onDismiss={dismiss} onCopy={copyLink} copiedId={copiedId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating "scroll to top" */}
      {showJump && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 h-11 w-11 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xl grid place-items-center hover:scale-105 transition animate-in fade-in zoom-in"
          aria-label="Back to top"
        >
          <ArrowDown className="h-5 w-5 rotate-180" />
        </button>
      )}
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function Stat({ label, value, tone, icon: Icon, highlight }: any) {
  const t = TONE[tone] ?? TONE.sky;
  return (
    <div className={cn(
      "rounded-xl border bg-white/70 dark:bg-card/60 backdrop-blur px-3 py-2.5 ring-1 transition-all",
      t.ring,
      highlight && "shadow-md"
    )}>
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-lg grid place-items-center", t.bg, t.text)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="text-lg font-bold leading-none mt-0.5 tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

function TimelineCard({
  n, idx, pinned, onPin, onDismiss, onCopy, copiedId,
}: {
  n: N; idx: number; pinned?: boolean;
  onPin: (id: string) => void;
  onDismiss: (id: string) => void;
  onCopy: (n: N) => void;
  copiedId: string | null;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const tone = TONE[meta.tone];
  const Icon = meta.icon;
  const isLatest = !n.is_read;

  return (
    <div
      className="relative pl-12 group animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      {/* Timeline node */}
      <div className={cn(
        "absolute left-0 top-4 h-10 w-10 rounded-xl grid place-items-center ring-4 ring-background transition-all group-hover:scale-110 group-hover:rotate-3",
        tone.bg, tone.text
      )}>
        <Icon className="h-5 w-5" />
        {isLatest && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", tone.dot)} />
            <span className={cn("relative inline-flex rounded-full h-3 w-3 ring-2 ring-background", tone.dot)} />
          </span>
        )}
      </div>

      <Card className={cn(
        "relative overflow-hidden ring-1 transition-all hover:shadow-xl border-l-4",
        tone.ring, tone.border,
        isLatest ? "shadow-md" : "shadow-sm",
        pinned && "ring-amber-200/80 dark:ring-amber-500/30"
      )}>
        {isLatest && (
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none", tone.gradient)} />
        )}
        <div className="relative p-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", tone.chip)}>
              {meta.label}
            </span>
            {isLatest && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white">
                New
              </span>
            )}
            {pinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" /> {timeAgo(n.created_at)}
              <span className="hidden sm:inline">· {new Date(n.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </span>
          </div>

          <h3 className="font-semibold text-base sm:text-lg leading-snug text-foreground">{n.title}</h3>
          {n.message && (
            <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-line leading-relaxed">{n.message}</p>
          )}

          {n.image_url && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border bg-muted/30">
              <img
                src={n.image_url}
                alt={n.title}
                loading="lazy"
                className="w-full max-h-[360px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {n.link_url && (
              n.link_url.startsWith("/") ? (
                <Button asChild size="sm" className="bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90 text-white shadow-sm">
                  <Link to={n.link_url}>
                    {n.link_label || "View details"} <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="bg-gradient-to-r from-sky-500 to-blue-600 hover:opacity-90 text-white shadow-sm">
                  <a href={n.link_url} target="_blank" rel="noreferrer">
                    {n.link_label || "Open link"} <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </Button>
              )
            )}

            {/* Quick actions — always visible on mobile, surface on hover on desktop */}
            <div className="ml-auto flex items-center gap-1 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onPin(n.id)}
                title={pinned ? "Unpin" : "Pin to top"}
                className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition"
              >
                {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              {n.link_url && (
                <button
                  onClick={() => onCopy(n)}
                  title="Copy link"
                  className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition"
                >
                  {copiedId === n.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                onClick={() => onDismiss(n.id)}
                title="Dismiss"
                className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
