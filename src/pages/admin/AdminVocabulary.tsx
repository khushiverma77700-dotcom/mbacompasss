import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pencil, Sparkles, Upload, BookOpen, Calendar, Wand2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["finance","marketing","consulting","hr","economics","corp_comm","general"];
const DIFFICULTIES = ["beginner","intermediate","cat","gdpi"];

function slugify(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminVocabulary() {
  const { toast } = useToast();
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const [openForm, setOpenForm] = useState(false);
  const [csv, setCsv] = useState("");
  const [wotdDate, setWotdDate] = useState(new Date().toISOString().slice(0, 10));
  const [wotdWordId, setWotdWordId] = useState("");

  // Bulk AI generator state
  const [bulkCount, setBulkCount] = useState(1000);
  const [bulkCategory, setBulkCategory] = useState<string>("any");
  const [bulkDifficulty, setBulkDifficulty] = useState<string>("any");
  const [bulkExam, setBulkExam] = useState<string>("any");
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkJob, setBulkJob] = useState<any>(null);
  const [bulkStarting, setBulkStarting] = useState(false);

  // Backfill state
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillStatus, setBackfillStatus] = useState<{ processed: number; remaining: number } | null>(null);

  document.title = "Vocabulary Admin | MBA Compass";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("vocab_words").select("*").order("created_at", { ascending: false }).limit(500);
    setWords(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Poll active bulk job
  useEffect(() => {
    if (!bulkJobId) return;
    let stopped = false;
    const tick = async () => {
      const { data } = await supabase.from("vocab_generation_jobs").select("*").eq("id", bulkJobId).maybeSingle();
      if (!stopped && data) {
        setBulkJob(data);
        if (data.status === "completed" || data.status === "failed") {
          load();
          return;
        }
        setTimeout(tick, 2500);
      }
    };
    tick();
    return () => { stopped = true; };
  }, [bulkJobId]);

  const startBulk = async () => {
    setBulkStarting(true);
    setBulkJob(null);
    const { data, error } = await supabase.functions.invoke("vocab-bulk-generate", {
      body: {
        count: Math.max(1, Math.min(5000, Number(bulkCount) || 100)),
        category: bulkCategory === "any" ? null : bulkCategory,
        difficulty: bulkDifficulty === "any" ? null : bulkDifficulty,
      },
    });
    setBulkStarting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed to start", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setBulkJobId((data as any).job_id);
    toast({ title: "AI generation started", description: "Running in the background — progress will update live." });
  };

  const save = async () => {
    if (!editing?.word || !editing?.meaning) {
      toast({ title: "Word and meaning are required", variant: "destructive" });
      return;
    }
    const row = {
      ...editing,
      slug: slugify(editing.word),
      synonyms: typeof editing.synonyms === "string" ? editing.synonyms.split(",").map((s: string) => s.trim()).filter(Boolean) : editing.synonyms || [],
      antonyms: typeof editing.antonyms === "string" ? editing.antonyms.split(",").map((s: string) => s.trim()).filter(Boolean) : editing.antonyms || [],
    };
    const { error } = editing.id
      ? await supabase.from("vocab_words").update(row).eq("id", editing.id)
      : await supabase.from("vocab_words").upsert(row, { onConflict: "slug" });
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Saved" });
    setOpenForm(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this word?")) return;
    await supabase.from("vocab_words").delete().eq("id", id);
    load();
  };

  const aiEnrich = async (w: any) => {
    toast({ title: "Calling AI…" });
    const { data, error } = await supabase.functions.invoke("vocab-explain", { body: { word: w.word, save: true, force: true } });
    if (error || data?.error) { toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" }); return; }
    toast({ title: "Enriched" });
    load();
  };

  const backfillMissing = async () => {
    setBackfillRunning(true);
    setBackfillStatus({ processed: 0, remaining: 0 });
    let totalProcessed = 0;
    try {
      // Loop in batches until done
      // Cap at 30 iterations to avoid runaway
      for (let i = 0; i < 30; i++) {
        const { data, error } = await supabase.functions.invoke("vocab-backfill", { body: { batch: 8 } });
        if (error) { toast({ title: "Backfill error", description: error.message, variant: "destructive" }); break; }
        if (data?.error) { toast({ title: "Backfill error", description: data.error, variant: "destructive" }); break; }
        totalProcessed += data?.processed || 0;
        setBackfillStatus({ processed: totalProcessed, remaining: data?.remaining || 0 });
        if (data?.done || (data?.processed || 0) === 0) break;
      }
      toast({ title: "Backfill complete", description: `Enriched ${totalProcessed} word(s)` });
      load();
    } finally {
      setBackfillRunning(false);
    }
  };

  const importCSV = async () => {
    // Format: word,meaning,hinglish,category,difficulty,part_of_speech,synonyms;synonyms,antonyms;antonyms,example_business
    const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.map((l) => {
      const parts = l.split(",").map((p) => p.trim());
      const [word, meaning, hinglish, category, difficulty, pos, syn, ant, ex] = parts;
      if (!word || !meaning) return null;
      return {
        word, slug: slugify(word), meaning,
        hinglish_meaning: hinglish || null,
        category: (CATEGORIES.includes(category) ? category : "general"),
        difficulty: (DIFFICULTIES.includes(difficulty) ? difficulty : "intermediate"),
        part_of_speech: pos || null,
        synonyms: syn ? syn.split(";").map((s) => s.trim()).filter(Boolean) : [],
        antonyms: ant ? ant.split(";").map((s) => s.trim()).filter(Boolean) : [],
        example_business: ex || null,
        source: "csv",
      };
    }).filter(Boolean);
    if (rows.length === 0) { toast({ title: "No valid rows" }); return; }
    const { error } = await supabase.from("vocab_words").upsert(rows as any, { onConflict: "slug" });
    if (error) toast({ title: "Import failed", description: error.message, variant: "destructive" });
    else { toast({ title: `Imported ${rows.length} words` }); setCsv(""); load(); }
  };

  const scheduleWOTD = async () => {
    if (!wotdWordId || !wotdDate) { toast({ title: "Pick date and word" }); return; }
    const { error } = await supabase.from("vocab_word_of_day").upsert({ on_date: wotdDate, word_id: wotdWordId }, { onConflict: "on_date" });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Word of the Day scheduled" });
  };

  const filtered = words.filter((w) => !search || w.word.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Vocabulary Admin
        </h1>
        <p className="text-sm text-muted-foreground">Manage the B-School Vocabulary library, schedule Words of the Day, and import in bulk.</p>
      </div>

      <Tabs defaultValue="words">
        <TabsList>
          <TabsTrigger value="words">Words ({words.length})</TabsTrigger>
          <TabsTrigger value="bulk">AI Bulk Generator</TabsTrigger>
          <TabsTrigger value="wotd">Word of the Day</TabsTrigger>
          <TabsTrigger value="import">CSV Import</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" /> AI Bulk Word Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate up to <b>5000</b> unique MBA / business words in one run. Each word is created with English meaning, Hindi meaning (Devanagari), Hinglish explanation, syllable-broken pronunciation, synonyms, antonyms, business / interview / email examples, and known past-exam appearances. Existing words across the entire library are automatically skipped so every run only adds 100% new entries.
              </p>
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 2500, 5000].map((n) => (
                  <Button key={n} type="button" variant={bulkCount === n ? "default" : "outline"} size="sm" onClick={() => setBulkCount(n)}>
                    +{n.toLocaleString()} words
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">How many words?</label>
                  <Input type="number" min={1} max={5000} value={bulkCount} onChange={(e) => setBulkCount(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Mixed (recommended)</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Difficulty</label>
                  <Select value={bulkDifficulty} onValueChange={setBulkDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Mixed (recommended)</SelectItem>
                      {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={startBulk} disabled={bulkStarting || (bulkJob && bulkJob.status === "running")} className="gap-2">
                {bulkStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                Start AI Generation
              </Button>

              {bulkJob && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">Status: {bulkJob.status}</span>
                    <span className="text-muted-foreground">{bulkJob.generated} / {bulkJob.requested} added</span>
                  </div>
                  <Progress value={Math.min(100, Math.round((bulkJob.generated / Math.max(1, bulkJob.requested)) * 100))} />
                  <p className="text-xs text-muted-foreground">{bulkJob.current_activity || ""}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Duplicates skipped: <b className="text-foreground">{bulkJob.duplicates}</b></span>
                    <span>Failed batches: <b className="text-foreground">{bulkJob.failed}</b></span>
                  </div>
                  {bulkJob.error && <p className="text-xs text-destructive">{bulkJob.error}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="words" className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Input placeholder="Search words…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Button onClick={() => { setEditing({ category: "general", difficulty: "intermediate", synonyms: [], antonyms: [] }); setOpenForm(true); }} className="gap-1">
              <Plus className="w-4 h-4" /> Add Word
            </Button>
            <Button onClick={backfillMissing} disabled={backfillRunning} variant="outline" className="gap-1">
              {backfillRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Enrich Missing Fields (Hindi · Pronunciation · Examples)
            </Button>
            {backfillStatus && (
              <span className="text-xs text-muted-foreground">
                Enriched {backfillStatus.processed} · {backfillStatus.remaining} remaining
              </span>
            )}
          </div>

          {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto my-10" /> : (
            <Card><CardContent className="pt-4 pb-4">
              <div className="divide-y divide-border">
                {filtered.map((w) => (
                  <div key={w.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground">{w.word}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize">{w.difficulty}</Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">{w.category?.replace("_", " ")}</Badge>
                        {w.source && <Badge variant="outline" className="text-[10px]">{w.source}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{w.meaning}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => aiEnrich(w)} title="Enrich with AI"><Sparkles className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...w, synonyms: w.synonyms?.join(", "), antonyms: w.antonyms?.join(", ") }); setOpenForm(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(w.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="wotd">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calendar className="w-5 h-5" /> Schedule Word of the Day</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input type="date" value={wotdDate} onChange={(e) => setWotdDate(e.target.value)} />
              <Select value={wotdWordId} onValueChange={setWotdWordId}>
                <SelectTrigger><SelectValue placeholder="Pick word" /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-auto">
                  {words.map((w) => <SelectItem key={w.id} value={w.id}>{w.word}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={scheduleWOTD}>Schedule</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Upload className="w-5 h-5" /> CSV Import</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Format: <code>word,meaning,hinglish,category,difficulty,part_of_speech,syn;syn,ant;ant,example_business</code>. One row per line. Existing slugs are upserted.</p>
              <Textarea rows={10} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Synergy,Combined value greater than parts,Do cheezein milkar...,consulting,intermediate,noun,cooperation,dyssynergy,The merger delivered cost synergies." />
              <Button onClick={importCSV}>Import</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Word" : "Add Word"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Word *" value={editing.word || ""} onChange={(e) => setEditing({ ...editing, word: e.target.value })} />
                <Input placeholder="Part of speech" value={editing.part_of_speech || ""} onChange={(e) => setEditing({ ...editing, part_of_speech: e.target.value })} />
              </div>
              <Textarea placeholder="Meaning *" value={editing.meaning || ""} onChange={(e) => setEditing({ ...editing, meaning: e.target.value })} />
              <Textarea placeholder="Hinglish meaning" value={editing.hinglish_meaning || ""} onChange={(e) => setEditing({ ...editing, hinglish_meaning: e.target.value })} />
              <Input placeholder="Pronunciation (IPA)" value={editing.pronunciation || ""} onChange={(e) => setEditing({ ...editing, pronunciation: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={editing.category || "general"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={editing.difficulty || "intermediate"} onValueChange={(v) => setEditing({ ...editing, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Synonyms (comma separated)" value={editing.synonyms || ""} onChange={(e) => setEditing({ ...editing, synonyms: e.target.value })} />
              <Input placeholder="Antonyms (comma separated)" value={editing.antonyms || ""} onChange={(e) => setEditing({ ...editing, antonyms: e.target.value })} />
              <Textarea placeholder="Business example" value={editing.example_business || ""} onChange={(e) => setEditing({ ...editing, example_business: e.target.value })} />
              <Textarea placeholder="Interview example" value={editing.example_interview || ""} onChange={(e) => setEditing({ ...editing, example_interview: e.target.value })} />
              <Textarea placeholder="Email example" value={editing.example_email || ""} onChange={(e) => setEditing({ ...editing, example_email: e.target.value })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
