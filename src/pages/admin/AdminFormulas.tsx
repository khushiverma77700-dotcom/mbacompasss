import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Sparkles, Trash2, Save, Sigma, ListPlus } from "lucide-react";

export default function AdminFormulas() {
  const { toast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [filter, setFilter] = useState({ topic: "all", q: "" });
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [genTopic, setGenTopic] = useState<string>("");
  const [genCount, setGenCount] = useState<number>(10);
  const [genDifficulty, setGenDifficulty] = useState<string>("intermediate");
  const [genBusy, setGenBusy] = useState(false);
  const [topicBusy, setTopicBusy] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<{ inserted: number; returned: number; rejected: { name: string; reason: string }[] } | null>(null);
  const [stats, setStats] = useState<{ total: number; published: number }>({ total: 0, published: 0 });

  const load = useCallback(async () => {
    const [{ data: t }, { data: f }, { count: total }, { count: pub }] = await Promise.all([
      supabase.from("quant_topics").select("*").order("sort_order"),
      supabase.from("quant_formulas").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("quant_formulas").select("id", { count: "exact", head: true }),
      supabase.from("quant_formulas").select("id", { count: "exact", head: true }).eq("published", true),
    ]);
    setTopics(t || []); setFormulas(f || []);
    setStats({ total: total || 0, published: pub || 0 });
    if (t?.length && !genTopic) setGenTopic(t[0].slug);
  }, [genTopic]);

  useEffect(() => { load(); }, [load]);

  const visible = formulas.filter((f) => {
    if (filter.topic !== "all" && f.topic_slug !== filter.topic) return false;
    if (filter.q && !`${f.name} ${f.expression}`.toLowerCase().includes(filter.q.toLowerCase())) return false;
    return true;
  });

  const startCreate = () => {
    setEditing({
      slug: "", name: "", expression: "", expression_latex: "", explanation: "", derivation: "",
      shortcuts: [], notes: "", common_mistakes: [], topic_slug: genTopic || topics[0]?.slug || "",
      difficulty: "intermediate", exam_tags: ["CAT"], importance: 4, is_shortcut: false,
      is_high_weightage: true, examples: [], seo_title: "", seo_description: "",
      seo_keywords: [], faqs: [], published: true,
    });
  };

  const save = async () => {
    if (!editing?.name || !editing?.expression || !editing?.topic_slug) {
      toast({ title: "Name, expression and topic are required", variant: "destructive" }); return;
    }
    setBusy(true);
    const row = { ...editing };
    if (!row.slug) row.slug = `${row.topic_slug}-${row.name.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80)}`.slice(0, 100);
    if (typeof row.shortcuts === "string") row.shortcuts = row.shortcuts.split(/\n+/).map((s: string) => s.trim()).filter(Boolean);
    if (typeof row.common_mistakes === "string") row.common_mistakes = row.common_mistakes.split(/\n+/).map((s: string) => s.trim()).filter(Boolean);
    if (typeof row.exam_tags === "string") row.exam_tags = row.exam_tags.split(",").map((s: string) => s.trim()).filter(Boolean);
    if (typeof row.seo_keywords === "string") row.seo_keywords = row.seo_keywords.split(",").map((s: string) => s.trim()).filter(Boolean);

    const { error } = row.id
      ? await supabase.from("quant_formulas").update(row).eq("id", row.id)
      : await supabase.from("quant_formulas").insert(row);
    setBusy(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this formula?")) return;
    const { error } = await supabase.from("quant_formulas").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); load(); }
  };

  const togglePublish = async (row: any) => {
    await supabase.from("quant_formulas").update({ published: !row.published }).eq("id", row.id);
    load();
  };

  const runAiBulk = async (overrideSlug?: string, overrideCount?: number) => {
    const slug = overrideSlug || genTopic;
    const topic = topics.find((t) => t.slug === slug);
    if (!topic) { toast({ title: "Pick a topic" }); return; }
    const isPerTopic = !!overrideSlug;
    if (isPerTopic) setTopicBusy(slug); else setGenBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("formula-topic-generate", {
        body: { topic_slug: topic.slug, topic_name: topic.name, count: overrideCount ?? genCount, difficulty: genDifficulty },
      });
      if (error) throw error;
      setLastRun({ inserted: data?.inserted ?? 0, returned: data?.returned ?? 0, rejected: data?.rejected || [] });
      toast({
        title: `${topic.name}: +${data?.inserted ?? 0} formulas`,
        description: `AI returned ${data?.returned ?? 0}, ${data?.rejected?.length ?? 0} rejected for quality.`,
      });
      load();
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e.message, variant: "destructive" });
    } finally {
      if (isPerTopic) setTopicBusy(null); else setGenBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
            <Sigma className="h-3 w-3" /> Quant Formula Book
          </div>
          <h1 className="font-heading mt-1 text-2xl font-bold text-slate-900">Formula Book — Admin</h1>
          <p className="text-sm text-slate-600">{stats.published} published · {stats.total} total</p>
        </div>
        <Button onClick={startCreate}><Plus className="mr-1 h-4 w-4" /> Add formula</Button>
      </header>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="generate">AI Generate</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-3">
              <Select value={filter.topic} onValueChange={(v) => setFilter((f) => ({ ...f, topic: v }))}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Topic" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {topics.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} placeholder="Search name / expression" className="max-w-sm" />
              <div className="ml-auto text-xs text-slate-500">{visible.length} shown</div>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Topic</th>
                  <th className="p-3">Difficulty</th>
                  <th className="p-3">Imp.</th>
                  <th className="p-3">Exams</th>
                  <th className="p-3">Published</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <tr key={f.id} className="border-t hover:bg-sky-50/40">
                    <td className="p-3 font-medium text-slate-900">{f.name}</td>
                    <td className="p-3 capitalize text-slate-600">{f.topic_slug?.replace(/-/g, " ")}</td>
                    <td className="p-3"><Badge variant="outline">{f.difficulty}</Badge></td>
                    <td className="p-3">{f.importance}</td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{(f.exam_tags || []).slice(0, 4).map((e: string) => <Badge key={e} className="bg-sky-100 text-[10px] text-sky-700">{e}</Badge>)}</div></td>
                    <td className="p-3"><Switch checked={f.published} onCheckedChange={() => togglePublish(f)} /></td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(f)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-sm text-slate-500">No formulas yet. Use AI Generate to seed your library.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-sky-600" /> Generate formulas with AI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label className="text-xs">Topic</Label>
                  <Select value={genTopic} onValueChange={setGenTopic}>
                    <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
                    <SelectContent>{topics.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Count (max 20 per run)</Label>
                  <Input type="number" min={1} max={20} value={genCount} onChange={(e) => setGenCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} />
                </div>
                <div>
                  <Label className="text-xs">Default difficulty</Label>
                  <Select value={genDifficulty} onValueChange={setGenDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="cat">CAT</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => runAiBulk()} disabled={genBusy} className="bg-gradient-to-r from-sky-600 to-blue-600">
                {genBusy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Generating…</> : <><ListPlus className="mr-1 h-4 w-4" /> Generate {genCount} formulas</>}
              </Button>
              <p className="text-xs text-slate-500">Every formula is verified for proper LaTeX (\frac, \sqrt, ^), at least 2 worked examples and a complete Usage section. Invalid entries are rejected automatically.</p>

              {lastRun && (
                <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-xs">
                  <div className="font-semibold text-slate-800">Last run: +{lastRun.inserted} inserted · {lastRun.returned} returned · {lastRun.rejected.length} rejected</div>
                  {lastRun.rejected.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 text-slate-600">
                      {lastRun.rejected.slice(0, 8).map((r, i) => (
                        <li key={i}>• <span className="font-medium">{r.name}</span> — {r.reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-sky-600" /> One-click topic generators
              </CardTitle>
              <p className="text-xs text-slate-500">
                Each button generates 10 textbook-grade formulas for that topic with proper LaTeX (\frac, \sqrt, ^),
                full Usage notes and 2+ worked CAT-level examples. Duplicates and low-quality entries are auto-rejected.
              </p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((t) => {
                const topicCount = formulas.filter((f) => f.topic_slug === t.slug).length;
                const isBusy = topicBusy === t.slug;
                return (
                  <div key={t.slug} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-sky-50/40 p-3 transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{t.name}</div>
                        <div className="truncate text-[11px] text-slate-500">{t.slug}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-sky-200 text-[10px] text-sky-700">{topicCount} formulas</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 flex-1 gap-1 bg-gradient-to-r from-sky-600 to-blue-600 text-xs"
                        disabled={isBusy || genBusy}
                        onClick={() => runAiBulk(t.slug, 10)}
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {isBusy ? "Generating…" : "Generate 10"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        disabled={isBusy || genBusy}
                        onClick={() => runAiBulk(t.slug, 5)}
                      >
                        +5
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs"
                        onClick={() => setFilter({ topic: t.slug, q: "" })}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={() => setEditing(null)}>
          <Card className="my-8 w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{editing.id ? "Edit formula" : "New formula"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
                <Field label="Slug (auto if blank)"><Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
              </div>
              <Field label="Topic">
                <Select value={editing.topic_slug} onValueChange={(v) => setEditing({ ...editing, topic_slug: v })}>
                  <SelectTrigger><SelectValue placeholder="Topic" /></SelectTrigger>
                  <SelectContent>{topics.map((t) => <SelectItem key={t.slug} value={t.slug}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Expression (plain)"><Input value={editing.expression} onChange={(e) => setEditing({ ...editing, expression: e.target.value })} /></Field>
              <Field label="Expression (LaTeX)"><Input value={editing.expression_latex || ""} onChange={(e) => setEditing({ ...editing, expression_latex: e.target.value })} /></Field>
              <Field label="Explanation"><Textarea rows={3} value={editing.explanation} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} /></Field>
              <Field label="Derivation"><Textarea rows={3} value={editing.derivation || ""} onChange={(e) => setEditing({ ...editing, derivation: e.target.value })} /></Field>
              <Field label="Shortcuts (one per line)"><Textarea rows={2} value={Array.isArray(editing.shortcuts) ? editing.shortcuts.join("\n") : editing.shortcuts} onChange={(e) => setEditing({ ...editing, shortcuts: e.target.value })} /></Field>
              <Field label="Common mistakes (one per line)"><Textarea rows={2} value={Array.isArray(editing.common_mistakes) ? editing.common_mistakes.join("\n") : editing.common_mistakes} onChange={(e) => setEditing({ ...editing, common_mistakes: e.target.value })} /></Field>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Difficulty">
                  <Select value={editing.difficulty} onValueChange={(v) => setEditing({ ...editing, difficulty: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="cat">CAT</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Importance 1-5"><Input type="number" min={1} max={5} value={editing.importance} onChange={(e) => setEditing({ ...editing, importance: Number(e.target.value) })} /></Field>
                <Field label="Exam tags (comma)"><Input value={Array.isArray(editing.exam_tags) ? editing.exam_tags.join(", ") : editing.exam_tags} onChange={(e) => setEditing({ ...editing, exam_tags: e.target.value })} /></Field>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <FlagToggle label="High weightage" checked={editing.is_high_weightage} onChange={(v) => setEditing({ ...editing, is_high_weightage: v })} />
                <FlagToggle label="Shortcut" checked={editing.is_shortcut} onChange={(v) => setEditing({ ...editing, is_shortcut: v })} />
                <FlagToggle label="Published" checked={editing.published} onChange={(v) => setEditing({ ...editing, published: v })} />
              </div>
              <Field label="SEO title"><Input value={editing.seo_title || ""} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} /></Field>
              <Field label="SEO description"><Textarea rows={2} value={editing.seo_description || ""} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} /></Field>
              <Field label="SEO keywords (comma)"><Input value={Array.isArray(editing.seo_keywords) ? editing.seo_keywords.join(", ") : editing.seo_keywords} onChange={(e) => setEditing({ ...editing, seo_keywords: e.target.value })} /></Field>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
function FlagToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
