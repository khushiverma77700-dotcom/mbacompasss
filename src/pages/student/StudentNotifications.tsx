import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Calendar,
  Inbox,
  Megaphone,
  GraduationCap,
  AlertCircle,
  Info,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  info:    { icon: Info,         tone: "sky",     label: "Update" },
  success: { icon: CheckCheck,   tone: "emerald", label: "Good news" },
  alert:   { icon: AlertCircle,  tone: "rose",    label: "Important" },
  mock:    { icon: GraduationCap,tone: "violet",  label: "New Mock" },
  exam:    { icon: Megaphone,    tone: "amber",   label: "Exam Update" },
  college: { icon: GraduationCap,tone: "blue",    label: "College Update" },
};

const TONE: Record<string, { ring: string; bg: string; text: string; dot: string; chip: string; gradient: string }> = {
  sky:     { ring: "ring-sky-200/70 dark:ring-sky-500/30",         bg: "bg-sky-50 dark:bg-sky-500/10",         text: "text-sky-700 dark:text-sky-300",         dot: "bg-sky-500",     chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",            gradient: "from-sky-500/10 via-sky-500/5 to-transparent" },
  emerald: { ring: "ring-emerald-200/70 dark:ring-emerald-500/30", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200", gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent" },
  rose:    { ring: "ring-rose-200/70 dark:ring-rose-500/30",       bg: "bg-rose-50 dark:bg-rose-500/10",       text: "text-rose-700 dark:text-rose-300",       dot: "bg-rose-500",    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",         gradient: "from-rose-500/10 via-rose-500/5 to-transparent" },
  violet:  { ring: "ring-violet-200/70 dark:ring-violet-500/30",   bg: "bg-violet-50 dark:bg-violet-500/10",   text: "text-violet-700 dark:text-violet-300",   dot: "bg-violet-500",  chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",  gradient: "from-violet-500/10 via-violet-500/5 to-transparent" },
  amber:   { ring: "ring-amber-200/70 dark:ring-amber-500/30",     bg: "bg-amber-50 dark:bg-amber-500/10",     text: "text-amber-700 dark:text-amber-300",     dot: "bg-amber-500",   chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",      gradient: "from-amber-500/10 via-amber-500/5 to-transparent" },
  blue:    { ring: "ring-blue-200/70 dark:ring-blue-500/30",       bg: "bg-blue-50 dark:bg-blue-500/10",       text: "text-blue-700 dark:text-blue-300",       dot: "bg-blue-500",    chip: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",          gradient: "from-blue-500/10 via-blue-500/5 to-transparent" },
};

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
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("student_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Realtime: prepend new notifications as they arrive
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifications-feed-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "student_notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new as any, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Auto-mark all visible as read shortly after opening (so the bell badge clears)
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

  const markAll = async () => {
    if (!user) return;
    await supabase.from("student_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setItems(prev => prev.map(i => ({ ...i, is_read: true })));
  };

  const visible = useMemo(() => filter === "unread" ? items.filter(i => !i.is_read) : items, [items, filter]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const unreadCount = items.filter(i => !i.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 dark:border-sky-500/20 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-500/10 dark:via-background dark:to-blue-500/5 p-6 sm:p-8">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sky-200/40 dark:bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg shadow-sky-500/20">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Updates Timeline</h1>
                <p className="text-sm text-muted-foreground">All product updates, new mocks, exam alerts and announcements in one place.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-white/80 dark:bg-card/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 hover:bg-white">
                <Sparkles className="h-3 w-3 mr-1" /> {items.length} total
              </Badge>
              {unreadCount > 0 && (
                <Badge className="bg-rose-500 text-white hover:bg-rose-500 animate-pulse">
                  {unreadCount} new
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-sky-100 dark:border-sky-500/20 bg-white/70 dark:bg-card/60 p-1">
              <button
                onClick={() => setFilter("all")}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition", filter === "all" ? "bg-sky-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >All</button>
              <button
                onClick={() => setFilter("unread")}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition", filter === "unread" ? "bg-sky-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >Unread {unreadCount > 0 && `(${unreadCount})`}</button>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAll}>
                <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center border-sky-100 dark:border-sky-500/20">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-sky-50 dark:bg-sky-500/10 grid place-items-center mb-4">
            <Inbox className="h-8 w-8 text-sky-400" />
          </div>
          <div className="font-semibold text-lg">You're all caught up</div>
          <div className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            New mock launches, exam alerts and announcements from your mentors will appear here.
          </div>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical spine */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-sky-200 via-sky-100 to-transparent dark:from-sky-500/30 dark:via-sky-500/10" />

          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="flex items-center gap-2 mb-4 ml-12">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">{g.items.length}</span>
                </div>
                <div className="space-y-4">
                  {g.items.map((n, idx) => {
                    const meta = TYPE_META[n.type] ?? TYPE_META.info;
                    const tone = TONE[meta.tone];
                    const Icon = meta.icon;
                    const isLatest = !n.is_read;
                    return (
                      <div
                        key={n.id}
                        className="relative pl-12 group animate-in fade-in slide-in-from-bottom-2 duration-500"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Timeline node */}
                        <div className={cn(
                          "absolute left-0 top-4 h-10 w-10 rounded-xl grid place-items-center ring-4 ring-background transition-transform group-hover:scale-110",
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

                        {/* Card */}
                        <Card className={cn(
                          "relative overflow-hidden ring-1 transition-all hover:shadow-lg",
                          tone.ring,
                          isLatest ? "shadow-md" : "shadow-sm"
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

                            {n.link_url && (
                              <div className="mt-4">
                                {n.link_url.startsWith("/") ? (
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
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
