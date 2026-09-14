import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import type { Database as AppDatabase, Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { coercePublishValue, displayValue, inferValueType, normalizeEntityName, parseEditedValueStrict } from "@/lib/informationPortal";
import { AlertTriangle, CheckCircle2, Database, ExternalLink, FileSearch, Loader2, RefreshCw, Rocket, Search, ShieldCheck } from "lucide-react";

type Draft = AppDatabase["public"]["Tables"]["information_drafts"]["Row"];
type FieldValue = AppDatabase["public"]["Tables"]["information_field_values"]["Row"];
type Source = AppDatabase["public"]["Tables"]["information_sources"]["Row"];
type CollegeInsert = AppDatabase["public"]["Tables"]["colleges"]["Insert"];
type ExamInsert = AppDatabase["public"]["Tables"]["exams"]["Insert"];

const statusLabel = (status: string) => status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const asRecord = (value: Json): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

const AdminInformationPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null);
  const [fields, setFields] = useState<FieldValue[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [bulkType, setBulkType] = useState<"college" | "exam">("college");

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("information_drafts").select("*").order("updated_at", { ascending: false });
    setLoading(false);
    if (error) toast({ title: "Could not load drafts", description: error.message, variant: "destructive" });
    else setDrafts(data ?? []);
  }, [toast]);

  useEffect(() => { void loadDrafts(); }, [loadDrafts]);
  useEffect(() => {
    if (!selected) { setFields([]); setSources([]); return; }
    void Promise.all([
      supabase.from("information_field_values").select("*").eq("draft_id", selected.id).order("section_key").order("field_key"),
      supabase.from("information_sources").select("*").eq("draft_id", selected.id).order("is_official", { ascending: false }),
    ]).then(([fieldResult, sourceResult]) => {
      const error = fieldResult.error ?? sourceResult.error;
      if (error) { toast({ title: "Could not load review", description: error.message, variant: "destructive" }); return; }
      setFields(fieldResult.data ?? []); setSources(sourceResult.data ?? []);
    });
  }, [selected, toast]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return drafts.filter((draft) => !needle || draft.requested_name.toLowerCase().includes(needle) || draft.status.includes(needle));
  }, [drafts, query]);

  const updateField = async (field: FieldValue, raw: string) => {
    const definition = field.field_definition_id ? await supabase.from("information_field_definitions").select("value_type").eq("id", field.field_definition_id).maybeSingle() : null;
    const valueType = definition?.data?.value_type ?? inferValueType(field.edited_value ?? field.proposed_value);
    const parsed = parseEditedValueStrict(raw, valueType);
    if (!parsed.ok) { toast({ title: `Check ${statusLabel(field.field_key)}`, description: parsed.error, variant: "destructive" }); return; }
    const editedValue = parsed.value;
    const { error } = await supabase.from("information_field_values").update({ edited_value: editedValue, review_decision: "accepted" }).eq("id", field.id);
    if (error) { toast({ title: "Edit not saved", description: error.message, variant: "destructive" }); return; }
    setFields((current) => current.map((item) => item.id === field.id ? { ...item, edited_value: editedValue, review_decision: "accepted" } : item));
  };

  const setDecision = async (field: FieldValue, reviewDecision: "accepted" | "rejected") => {
    const { error } = await supabase.from("information_field_values").update({ review_decision: reviewDecision }).eq("id", field.id);
    if (error) { toast({ title: "Decision not saved", description: error.message, variant: "destructive" }); return; }
    setFields((current) => current.map((item) => item.id === field.id ? { ...item, review_decision: reviewDecision } : item));
  };

  const publish = async () => {
    if (!selected) return;
    if (fields.some((field) => field.is_required && field.review_decision !== "accepted") || fields.some((field) => field.verification_status === "conflict" && field.review_decision !== "accepted")) {
      toast({ title: "Review required", description: "Accept every required field and resolve all conflicts before publishing.", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const approvedPayload = { ...asRecord(selected.proposed_payload) };
      fields.forEach((field) => {
        if (field.review_decision === "accepted") {
          const merged = field.edited_value ?? field.proposed_value;
          const reference = field.proposed_value ?? asRecord(selected.proposed_payload)[field.field_key] as Json ?? merged;
          approvedPayload[field.field_key] = coercePublishValue(field.field_key, merged, reference);
        }
        if (field.review_decision === "rejected") delete approvedPayload[field.field_key];
      });
      let canonicalId = selected.canonical_record_id;
      if (selected.entity_type === "college") {
        const collegePayload = approvedPayload as CollegeInsert;
        if (canonicalId) { const { error } = await supabase.from("colleges").update(collegePayload).eq("id", canonicalId); if (error) throw error; }
        else { const { data, error } = await supabase.from("colleges").insert(collegePayload).select("id").single(); if (error) throw error; canonicalId = data.id; }
      } else {
        const examPayload = approvedPayload as ExamInsert;
        if (canonicalId) { const { error } = await supabase.from("exams").update(examPayload).eq("id", canonicalId); if (error) throw error; }
        else { const { data, error } = await supabase.from("exams").insert(examPayload).select("id").single(); if (error) throw error; canonicalId = data.id; }
      }
      const { data: auth } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const { error } = await supabase.from("information_drafts").update({ approved_payload: approvedPayload as Json, canonical_record_id: canonicalId, status: "published", published_at: now, reviewed_at: now, reviewed_by: auth.user?.id ?? null }).eq("id", selected.id);
      if (error) throw error;
      await supabase.from("information_audit_events").insert({ draft_id: selected.id, actor_id: auth.user?.id ?? null, entity_type: selected.entity_type, event_type: "approved_and_published", canonical_record_id: canonicalId, details: { canonical_record_id: canonicalId } });
      toast({ title: "Approved and published", description: `${selected.requested_name} is now live.` }); setSelected(null); await loadDrafts();
    } catch (error) { toast({ title: "Publish failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" }); }
    finally { setSaving(false); setConfirmPublish(false); }
  };

  const rejectDraft = async () => {
    if (!selected) return;
    const { error } = await supabase.from("information_drafts").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", selected.id);
    if (error) { toast({ title: "Could not reject draft", description: error.message, variant: "destructive" }); return; }
    setSelected(null); await loadDrafts();
  };

  const queueBulk = async () => {
    const names = Array.from(new Set(bulkNames.split(/\r?\n|,/).map((name) => name.trim()).filter(Boolean)));
    if (!names.length) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data: batch, error } = await supabase.from("information_research_batches").insert({ created_by: auth.user.id, entity_type: bulkType, label: `${bulkType === "college" ? "College" : "Exam"} research batch`, total_items: names.length, status: "queued" }).select("id").single();
    if (error) { toast({ title: "Batch not created", description: error.message, variant: "destructive" }); return; }
    const { error: draftError } = await supabase.from("information_drafts").insert(names.map((name) => ({ created_by: auth.user.id, batch_id: batch.id, entity_type: bulkType, requested_name: name, normalized_name: normalizeEntityName(name), status: "queued", operation: "create" })));
    if (draftError) { toast({ title: "Items not queued", description: draftError.message, variant: "destructive" }); return; }
    toast({ title: "Research queued", description: `${names.length} names are ready for evidence-based research.` }); setBulkNames(""); await loadDrafts();
  };

  const pending = drafts.filter((draft) => ["pending_review", "draft", "completed"].includes(draft.status)).length;
  const conflicts = drafts.reduce((total, draft) => total + draft.conflict_count, 0);
  const published = drafts.filter((draft) => draft.status === "published").length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-4xl font-bold">College & Exam Information</h1><p className="text-base text-muted-foreground">Research, verify, review, and publish evidence-backed records.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => navigate("/admin/colleges/generate-ai")}><FileSearch className="h-4 w-4 mr-2" />Research college</Button><Button onClick={() => navigate("/admin/exams")}><Search className="h-4 w-4 mr-2" />Research exam</Button></div></div>
    <div className="grid gap-3 md:grid-cols-4">{[["All drafts", drafts.length], ["Pending review", pending], ["Conflicts", conflicts], ["Published", published]].map(([label, value]) => <Card key={label}><CardContent className="pt-5"><div className="text-sm text-muted-foreground">{label}</div><div className="text-4xl font-bold">{value}</div></CardContent></Card>)}</div>
    <Tabs defaultValue="review"><TabsList><TabsTrigger value="review">Pending approvals</TabsTrigger><TabsTrigger value="bulk">Bulk research</TabsTrigger><TabsTrigger value="sources">Source verification</TabsTrigger></TabsList>
      <TabsContent value="review" className="space-y-4"><div className="flex gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search drafts" /><Button variant="outline" onClick={() => void loadDrafts()} aria-label="Refresh drafts"><RefreshCw className="h-4 w-4" /></Button></div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div> : <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.7fr)]"><div className="space-y-2">{filtered.map((draft) => <Card key={draft.id} className={selected?.id === draft.id ? "border-primary" : ""}><CardContent className="pt-4"><button className="w-full text-left" onClick={() => setSelected(draft)}><div className="flex justify-between gap-2"><strong>{draft.requested_name}</strong><Badge variant="outline">{statusLabel(draft.status)}</Badge></div><div className="mt-2 flex gap-2 text-sm text-muted-foreground"><span>{statusLabel(draft.entity_type)}</span><span>{draft.verified_field_count}/{draft.total_field_count} verified</span></div></button></CardContent></Card>)}</div>
          <div>{selected ? <Card><CardHeader><CardTitle className="flex items-center justify-between gap-2"><span>{selected.requested_name}</span><Badge>{statusLabel(selected.operation)}</Badge></CardTitle></CardHeader><CardContent className="space-y-5">{selected.missing_required_fields.length > 0 && <div className="flex gap-2 border border-destructive p-3 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" /><span>Missing required fields: {selected.missing_required_fields.join(", ")}</span></div>}
            {fields.map((field) => <div key={field.id} className="border-b pb-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><Label>{statusLabel(field.field_key)}</Label><div className="flex gap-1"><Badge variant="outline">{statusLabel(field.verification_status)}</Badge><Badge variant={field.review_decision === "accepted" ? "default" : "secondary"}>{statusLabel(field.review_decision)}</Badge></div></div><Textarea defaultValue={displayValue(field.edited_value ?? field.proposed_value)} onBlur={(event) => void updateField(field, event.target.value)} rows={typeof field.proposed_value === "object" ? 5 : 2} /><div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => void setDecision(field, "accepted")}><CheckCircle2 className="h-4 w-4 mr-1" />Accept</Button><Button size="sm" variant="ghost" onClick={() => void setDecision(field, "rejected")}>Reject</Button></div></div>)}
            <div><h2 className="text-2xl font-semibold mb-2">Official sources</h2>{sources.length ? sources.map((source) => <a key={source.id} href={source.final_url ?? source.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 border-b py-2 text-sm text-primary"><ShieldCheck className="h-4 w-4" />{source.title ?? source.url}<ExternalLink className="h-3 w-3" /></a>) : <p className="text-sm text-muted-foreground">No source evidence is attached. Review every field manually before approval.</p>}</div>
            <div className="flex flex-wrap gap-2 border-t pt-4"><Button onClick={() => setConfirmPublish(true)} disabled={selected.status === "published"}><Rocket className="h-4 w-4 mr-2" />Approve & publish</Button><Button variant="outline" onClick={() => void rejectDraft()}>Reject draft</Button></div></CardContent></Card> : <Card><CardContent className="py-16 text-center text-muted-foreground"><Database className="h-8 w-8 mx-auto mb-3" />Select a draft to review its fields and sources.</CardContent></Card>}</div></div>}
      </TabsContent>
      <TabsContent value="bulk"><Card><CardHeader><CardTitle>Bulk research queue</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><Button variant={bulkType === "college" ? "default" : "outline"} onClick={() => setBulkType("college")}>Colleges & universities</Button><Button variant={bulkType === "exam" ? "default" : "outline"} onClick={() => setBulkType("exam")}>Entrance exams</Button></div><Textarea value={bulkNames} onChange={(event) => setBulkNames(event.target.value)} rows={10} placeholder="One name per line" /><Button onClick={() => void queueBulk()} disabled={!bulkNames.trim()}>Queue research</Button><p className="text-sm text-muted-foreground">Queued items remain private drafts. Nothing is published automatically.</p></CardContent></Card></TabsContent>
      <TabsContent value="sources"><Card><CardHeader><CardTitle>Source verification</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-3"><div><div className="text-sm text-muted-foreground">Official sources</div><strong className="text-2xl">{sources.filter((source) => source.is_official).length}</strong></div><div><div className="text-sm text-muted-foreground">Unchecked links</div><strong className="text-2xl">{sources.filter((source) => source.link_status === "unchecked").length}</strong></div><div><div className="text-sm text-muted-foreground">Broken links</div><strong className="text-2xl">{sources.filter((source) => source.link_status === "broken").length}</strong></div></div></CardContent></Card></TabsContent>
    </Tabs>
    <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Approve and publish this record?</AlertDialogTitle><AlertDialogDescription>Only accepted fields will be written to the live page. This action is recorded in the audit history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Continue reviewing</AlertDialogCancel><AlertDialogAction onClick={() => void publish()} disabled={saving}>{saving ? "Publishing…" : "Approve & publish"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
};

export default AdminInformationPortal;