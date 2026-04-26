import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Minus, Users, FileSpreadsheet, GraduationCap, ClipboardList, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type Section = "all" | "results" | "movement" | "rti" | "applications";

const SECTION_META: Record<Exclude<Section, "all">, { label: string; icon: any; color: string }> = {
  results: { label: "Results Status", icon: ClipboardList, color: "from-blue-500 to-cyan-500" },
  movement: { label: "Waitlist Movement", icon: TrendingUp, color: "from-violet-500 to-purple-500" },
  rti: { label: "RTI Insights", icon: FileSpreadsheet, color: "from-emerald-500 to-teal-500" },
  applications: { label: "Application Funnel", icon: GraduationCap, color: "from-orange-500 to-rose-500" },
};

export default function AdminIIMWaitlist() {
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [movement, setMovement] = useState<any[]>([]);
  const [rti, setRti] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState<Section | null>(null);

  const loadAll = async () => {
    const [r, m, rt, a, l] = await Promise.all([
      supabase.from("iim_waitlist_results").select("*").order("sort_order"),
      supabase.from("iim_waitlist_movement").select("*").order("sort_order"),
      supabase.from("iim_waitlist_rti").select("*").order("sort_order"),
      supabase.from("iim_waitlist_applications").select("*").order("sort_order"),
      supabase.from("iim_waitlist_leads").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setResults(r.data || []);
    setMovement(m.data || []);
    setRti(rt.data || []);
    setApps(a.data || []);
    setLeads(l.data || []);
  };

  useEffect(() => { loadAll(); }, []);

  const refresh = async (section: Section) => {
    setRefreshing(section);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-iim-waitlist", { body: { section } });
      if (error) throw error;
      const total = (data as any)?.summary?.reduce((s: number, x: any) => s + x.changed, 0) || 0;
      toast({
        title: "✨ AI refresh queued",
        description: `${total} change(s) ready for review in the Content Refresh Queue.`,
      });
    } catch (e: any) {
      toast({ title: "Refresh failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setRefreshing(null);
    }
  };

  const counts = {
    declared: results.filter(r => r.status === "declared").length,
    coming: results.filter(r => r.status === "coming_soon").length,
    expected: results.filter(r => r.status === "expected").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-blue-600 p-8 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <Badge className="mb-3 bg-white/20 text-white border-white/30 hover:bg-white/30">Updated for CAT 2026</Badge>
            <h1 className="font-heading text-3xl lg:text-4xl font-bold mb-2">IIM Waitlist Movement & RTI</h1>
            <p className="text-white/85 max-w-2xl">Manage 23+ college result statuses, 5-year waitlist trends, RTI insights and the application funnel. AI auto-refresh routes through the Content Refresh Queue for review.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => refresh("all")} disabled={!!refreshing} size="lg" className="bg-white text-primary hover:bg-white/90 hover-scale shadow-lg">
              {refreshing === "all" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Refresh ALL via AI
            </Button>
            <Link to="/admin/content-refreshes"><Button variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 w-full">View Refresh Queue →</Button></Link>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Results Declared", value: counts.declared, icon: ClipboardList, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Coming Soon", value: counts.coming, icon: RefreshCw, color: "text-orange-600 bg-orange-500/10" },
          { label: "Expected", value: counts.expected, icon: TrendingUp, color: "text-blue-600 bg-blue-500/10" },
          { label: "Lead Submissions", value: leads.length, icon: Users, color: "text-violet-600 bg-violet-500/10" },
        ].map((s, i) => (
          <Card key={i} className="p-4 hover-scale transition-all hover:shadow-md">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color} mb-2`}><s.icon className="w-5 h-5" /></div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* PER-SECTION REFRESH CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(SECTION_META) as Array<Exclude<Section, "all">>).map(sec => {
          const m = SECTION_META[sec];
          const Icon = m.icon;
          return (
            <Card key={sec} className="p-4 hover-scale transition-all">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5 text-white" /></div>
              <div className="font-semibold text-sm mb-1">{m.label}</div>
              <p className="text-xs text-muted-foreground mb-3">AI-research latest 2026 data for this section.</p>
              <Button onClick={() => refresh(sec)} disabled={!!refreshing} size="sm" variant="outline" className="w-full">
                {refreshing === sec ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Refresh
              </Button>
            </Card>
          );
        })}
      </div>

      {/* DATA TABS */}
      <Card className="p-6">
        <Tabs defaultValue="results">
          <TabsList className="mb-4">
            <TabsTrigger value="results">Results ({results.length})</TabsTrigger>
            <TabsTrigger value="movement">Movement ({movement.length})</TabsTrigger>
            <TabsTrigger value="rti">RTI ({rti.length})</TabsTrigger>
            <TabsTrigger value="applications">Applications ({apps.length})</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          </TabsList>

          {/* RESULTS */}
          <TabsContent value="results" className="space-y-2 animate-fade-in">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr><th className="text-left p-3">College</th><th className="text-left p-3">Type</th><th className="text-left p-3">Date</th><th className="text-left p-3">Status</th></tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{r.college_name}</td>
                      <td className="p-3"><Badge variant="outline">{r.college_type}</Badge></td>
                      <td className="p-3 text-muted-foreground">{r.result_date_label || "—"}</td>
                      <td className="p-3">
                        <Badge className={
                          r.status === "declared" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20" :
                          r.status === "coming_soon" ? "bg-orange-500/15 text-orange-700 border-orange-500/30 hover:bg-orange-500/20" :
                          "bg-blue-500/15 text-blue-700 border-blue-500/30 hover:bg-blue-500/20"
                        }>{r.status === "declared" ? "Out" : r.status === "coming_soon" ? "Coming Soon" : "Expected"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* MOVEMENT CARDS */}
          <TabsContent value="movement" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {movement.map(m => {
                const TrendIcon = m.trend === "rising" ? TrendingUp : m.trend === "falling" ? TrendingDown : Minus;
                const trendColor = m.trend === "rising" ? "text-emerald-600 bg-emerald-500/10" : m.trend === "falling" ? "text-rose-600 bg-rose-500/10" : "text-muted-foreground bg-muted";
                return (
                  <Card key={m.id} className="p-4 hover:shadow-md transition-all hover-scale">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm">{m.college_name}</div>
                        <div className="text-xs text-muted-foreground">{m.college_short} · {m.college_type}</div>
                      </div>
                      <Badge className={trendColor}><TrendIcon className="w-3 h-3 mr-1" />{m.trend}</Badge>
                    </div>
                    <div className="grid grid-cols-6 gap-1 text-center text-xs">
                      {[2021, 2022, 2023, 2024, 2025].map(y => (
                        <div key={y} className="p-1.5 rounded bg-muted/50">
                          <div className="font-bold text-foreground">{m[`wl_${y}`] ?? "—"}</div>
                          <div className="text-[10px] text-muted-foreground">'{String(y).slice(2)}</div>
                        </div>
                      ))}
                      <div className="p-1.5 rounded bg-primary/10 border border-primary/20">
                        <div className="font-bold text-primary">{m.wl_2026_est ?? "—"}</div>
                        <div className="text-[10px] text-primary/70">'26E</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* RTI */}
          <TabsContent value="rti" className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rti.map(r => (
                <Card key={r.id} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{r.college_name}</div>
                    <Badge variant="outline" className="text-xs">RTI {r.rti_year}</Badge>
                  </div>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {(r.insights || []).map((b: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">•</span><span dangerouslySetInnerHTML={{ __html: b }} /></li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* APPLICATIONS */}
          <TabsContent value="applications" className="animate-fade-in">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">College</th><th className="text-right p-3">Applications</th>
                    <th className="text-right p-3">Shortlisted</th><th className="text-right p-3">PI Called</th>
                    <th className="text-right p-3">Offers</th><th className="text-right p-3">Waitlist</th>
                    <th className="text-right p-3">Admitted</th><th className="text-right p-3">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map(a => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{a.college_name}</td>
                      <td className="p-3 text-right tabular-nums">{a.applications_received?.toLocaleString() || "—"}</td>
                      <td className="p-3 text-right tabular-nums">{a.shortlisted?.toLocaleString() || "—"}</td>
                      <td className="p-3 text-right tabular-nums">{a.called_for_pi?.toLocaleString() || "—"}</td>
                      <td className="p-3 text-right tabular-nums">{a.offers_made?.toLocaleString() || "—"}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-orange-600">{a.waitlisted?.toLocaleString() || "—"}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-emerald-600">{a.admitted?.toLocaleString() || "—"}</td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">{a.batch_size || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* LEADS */}
          <TabsContent value="leads" className="animate-fade-in">
            {leads.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No lead submissions yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="text-left p-3">When</th><th className="text-left p-3">Name</th><th className="text-left p-3">Contact</th><th className="text-left p-3">CAT %ile</th><th className="text-left p-3">Target IIMs</th><th className="text-left p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{l.name}</td>
                        <td className="p-3 text-xs">{l.email}<br /><span className="text-muted-foreground">{l.phone}</span></td>
                        <td className="p-3 tabular-nums">{l.cat_percentile ?? "—"}</td>
                        <td className="p-3 text-xs">{(l.target_iims || []).join(", ") || "—"}</td>
                        <td className="p-3"><Badge variant="outline">{l.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* PUBLIC PAGE NOTE */}
      <Card className="p-4 bg-muted/30 border-dashed">
        <p className="text-sm text-muted-foreground">
          ℹ️ This is an internal admin tool. Lead submissions arrive via the public form embed at <code className="px-1.5 py-0.5 rounded bg-background border text-foreground text-xs">/iim-waitlist-leads</code>. Wire it into any landing page using the <code className="px-1.5 py-0.5 rounded bg-background border text-foreground text-xs">iim_waitlist_leads</code> table directly.
        </p>
      </Card>
    </div>
  );
}
