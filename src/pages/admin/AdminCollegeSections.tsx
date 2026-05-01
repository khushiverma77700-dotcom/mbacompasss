import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, GripVertical, ArrowLeft, Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";
import { Progress } from "@/components/ui/progress";
import { useAdminFilters } from "@/hooks/useAdminFilters";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { useMemo } from "react";

const SECTION_TYPES = [
  { value: "courses_fees", label: "Courses & Fee Structure" },
  { value: "admission", label: "Admission Process" },
  { value: "placements", label: "Placement Statistics" },
  { value: "cutoff", label: "Cutoff Details" },
  { value: "rankings", label: "Rankings & Accreditations" },
  { value: "reviews", label: "Student Reviews" },
  { value: "gallery", label: "Campus Gallery" },
  { value: "scholarships", label: "Scholarships" },
  { value: "faculty", label: "Faculty Profiles" },
  { value: "hostel", label: "Hostel & Campus Life" },
  { value: "qa", label: "Frequently Asked Questions" },
  { value: "quick_info", label: "Quick Info / Sidebar" },
  { value: "why_join", label: "About / Overview (shown in 'About {College}' card)" },
  { value: "news", label: "Latest News & Articles" },
];

const emptyForm = {
  college_id: "",
  section_type: "courses_fees",
  title: "",
  content: "",
  data: {} as any,
  sort_order: 0,
};

const ListEditor = ({ items, onChange, fields, addLabel }: {
  items: any[]; onChange: (items: any[]) => void;
  fields: { key: string; label: string; type?: string; placeholder?: string }[];
  addLabel: string;
}) => {
  const addItem = () => { const newItem: any = {}; fields.forEach(f => { newItem[f.key] = ""; }); onChange([...items, newItem]); };
  const updateItem = (idx: number, key: string, val: string) => { const updated = [...items]; updated[idx] = { ...updated[idx], [key]: val }; onChange(updated); };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="border border-border rounded-lg p-3 space-y-2 relative bg-muted/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><GripVertical className="w-3 h-3" /> Item {idx + 1}</span>
            <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-6 w-6 p-0"><X className="w-3.5 h-3.5 text-destructive" /></Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map(f => (
              <div key={f.key} className={f.type === "textarea" ? "col-span-2" : ""}>
                <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={item[f.key] || ""} onChange={(e) => updateItem(idx, f.key, e.target.value)} placeholder={f.placeholder} className="text-sm h-16" />
                ) : (
                  <Input value={item[f.key] || ""} onChange={(e) => updateItem(idx, f.key, e.target.value)} placeholder={f.placeholder} className="text-sm h-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full"><Plus className="w-3 h-3 mr-1" /> {addLabel}</Button>
    </div>
  );
};

const SectionFormRenderer = ({ type, data, onChange, content, onContentChange }: {
  type: string; data: any; onChange: (d: any) => void; content: string; onContentChange: (c: string) => void;
}) => {
  switch (type) {
    case "courses_fees":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Courses List</Label><ListEditor items={data.courses || []} onChange={(items) => onChange({ ...data, courses: items })} fields={[{ key: "name", label: "Course Name", placeholder: "MBA / PGDM" },{ key: "duration", label: "Duration", placeholder: "2 Years" },{ key: "eligibility", label: "Eligibility", placeholder: "Graduation + CAT" },{ key: "fees", label: "Total Fees", placeholder: "₹20 Lakh" },{ key: "specializations", label: "Specializations", placeholder: "Finance, Marketing, HR" },]} addLabel="Add Course" /></div>);
    case "admission":
      return (<div className="space-y-3"><div><Label className="text-xs font-semibold text-muted-foreground">Admission Overview</Label><RichTextEditor content={content} onChange={onContentChange} placeholder="Describe the admission process..." /></div><Label className="text-xs font-semibold text-muted-foreground">Admission Steps</Label><ListEditor items={data.steps || []} onChange={(items) => onChange({ ...data, steps: items })} fields={[{ key: "title", label: "Step Title", placeholder: "Entrance Exam" },{ key: "description", label: "Description", placeholder: "Score well in CAT/XAT...", type: "textarea" },]} addLabel="Add Step" /><Label className="text-xs font-semibold text-muted-foreground">Eligibility Criteria</Label><ListEditor items={data.eligibility || []} onChange={(items) => onChange({ ...data, eligibility: items })} fields={[{ key: "text", label: "Criteria", placeholder: "Bachelor's degree with 50% marks" },]} addLabel="Add Criteria" /></div>);
    case "placements":
      return (<div className="space-y-3"><div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px] text-muted-foreground">Average Package</Label><Input value={data.avg_package || ""} onChange={(e) => onChange({ ...data, avg_package: e.target.value })} placeholder="₹25 LPA" className="h-8 text-sm" /></div><div><Label className="text-[10px] text-muted-foreground">Highest Package</Label><Input value={data.highest_package || ""} onChange={(e) => onChange({ ...data, highest_package: e.target.value })} placeholder="₹80 LPA" className="h-8 text-sm" /></div><div><Label className="text-[10px] text-muted-foreground">Median Package</Label><Input value={data.median_package || ""} onChange={(e) => onChange({ ...data, median_package: e.target.value })} placeholder="₹22 LPA" className="h-8 text-sm" /></div><div><Label className="text-[10px] text-muted-foreground">Placement Rate</Label><Input value={data.placement_rate || ""} onChange={(e) => onChange({ ...data, placement_rate: e.target.value })} placeholder="98%" className="h-8 text-sm" /></div></div><Label className="text-xs font-semibold text-muted-foreground">Sector-wise Placements</Label><ListEditor items={data.sectors || []} onChange={(items) => onChange({ ...data, sectors: items })} fields={[{ key: "sector", label: "Sector", placeholder: "Consulting" },{ key: "percentage", label: "Percentage", placeholder: "35" },]} addLabel="Add Sector" /><Label className="text-xs font-semibold text-muted-foreground">Top Recruiters</Label><ListEditor items={data.recruiters || []} onChange={(items) => onChange({ ...data, recruiters: items })} fields={[{ key: "name", label: "Company Name", placeholder: "McKinsey" }]} addLabel="Add Recruiter" /><div><Label className="text-xs font-semibold text-muted-foreground">Additional Details</Label><RichTextEditor content={content} onChange={onContentChange} placeholder="Extra placement info..." /></div></div>);
    case "cutoff":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Cutoff by Category</Label><ListEditor items={data.cutoffs || []} onChange={(items) => onChange({ ...data, cutoffs: items })} fields={[{ key: "category", label: "Category", placeholder: "General / OBC / SC / ST" },{ key: "percentile", label: "Cutoff Percentile", placeholder: "95" },{ key: "exam", label: "Exam", placeholder: "CAT" },{ key: "year", label: "Year", placeholder: "2025" },]} addLabel="Add Cutoff Entry" /><div><Label className="text-xs font-semibold text-muted-foreground">Additional Notes</Label><RichTextEditor content={content} onChange={onContentChange} placeholder="Additional cutoff information..." /></div></div>);
    case "rankings":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Rankings by Body</Label><ListEditor items={data.rankings || []} onChange={(items) => onChange({ ...data, rankings: items })} fields={[{ key: "body", label: "Ranking Body", placeholder: "NIRF" },{ key: "rank", label: "Rank", placeholder: "#5" },{ key: "year", label: "Year", placeholder: "2025" },]} addLabel="Add Ranking" /><Label className="text-xs font-semibold text-muted-foreground">Accreditations</Label><ListEditor items={data.accreditations || []} onChange={(items) => onChange({ ...data, accreditations: items })} fields={[{ key: "name", label: "Accreditation", placeholder: "AACSB / EQUIS / AMBA" }]} addLabel="Add Accreditation" /></div>);
    case "reviews":
      return (<div className="space-y-3"><div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px] text-muted-foreground">Overall Rating</Label><Input value={data.overall_rating || ""} onChange={(e) => onChange({ ...data, overall_rating: e.target.value })} placeholder="4.3" className="h-8 text-sm" /></div></div><Label className="text-xs font-semibold text-muted-foreground">Rating Aspects</Label><ListEditor items={data.aspects || []} onChange={(items) => onChange({ ...data, aspects: items })} fields={[{ key: "label", label: "Aspect", placeholder: "Academics" },{ key: "score", label: "Score (out of 5)", placeholder: "4.5" },]} addLabel="Add Aspect" /><Label className="text-xs font-semibold text-muted-foreground">Student Reviews</Label><ListEditor items={data.reviews || []} onChange={(items) => onChange({ ...data, reviews: items })} fields={[{ key: "name", label: "Student Name", placeholder: "Rahul S." },{ key: "year", label: "Batch", placeholder: "Batch 2024" },{ key: "rating", label: "Rating (1-5)", placeholder: "5" },{ key: "positives", label: "Positives", placeholder: "Great faculty, infrastructure...", type: "textarea" },{ key: "negatives", label: "Negatives", placeholder: "High fees, workload...", type: "textarea" },]} addLabel="Add Review" /></div>);
    case "gallery":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Gallery Images</Label>{(data.images || []).map((img: any, idx: number) => (<div key={idx} className="flex items-center gap-2 border border-border rounded-lg p-2"><FileUpload bucket="uploads" folder="colleges/gallery" value={img.url || ""} onChange={(url) => { const updated = [...(data.images || [])]; updated[idx] = { ...updated[idx], url }; onChange({ ...data, images: updated }); }} accept="image/*" label={`Image ${idx + 1}`} sizeHint="800×600 px (4:3 ratio, JPG) • Max 200 KB" /><div className="flex-1"><Input value={img.caption || ""} onChange={(e) => { const updated = [...(data.images || [])]; updated[idx] = { ...updated[idx], caption: e.target.value }; onChange({ ...data, images: updated }); }} placeholder="Caption (optional)" className="h-8 text-sm" /></div><Button variant="ghost" size="sm" onClick={() => onChange({ ...data, images: (data.images || []).filter((_: any, i: number) => i !== idx) })}><X className="w-3.5 h-3.5 text-destructive" /></Button></div>))}<Button variant="outline" size="sm" onClick={() => onChange({ ...data, images: [...(data.images || []), { url: "", caption: "" }] })} className="w-full"><Plus className="w-3 h-3 mr-1" /> Add Image</Button></div>);
    case "scholarships":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Scholarships</Label><ListEditor items={data.scholarships || []} onChange={(items) => onChange({ ...data, scholarships: items })} fields={[{ key: "name", label: "Scholarship Name", placeholder: "Merit Scholarship" },{ key: "criteria", label: "Criteria", placeholder: "Top 10% CAT percentile" },{ key: "amount", label: "Amount", placeholder: "Up to 50% tuition waiver" },{ key: "description", label: "Description", placeholder: "Details about the scholarship...", type: "textarea" },]} addLabel="Add Scholarship" /></div>);
    case "faculty":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Faculty Members</Label><ListEditor items={data.faculty || []} onChange={(items) => onChange({ ...data, faculty: items })} fields={[{ key: "name", label: "Full Name", placeholder: "Prof. Rajesh Kumar" },{ key: "department", label: "Department", placeholder: "Finance & Accounting" },{ key: "qualification", label: "Qualification", placeholder: "PhD IIM Ahmedabad" },{ key: "experience", label: "Experience", placeholder: "20+ years" },{ key: "photo_url", label: "Photo URL (optional)", placeholder: "https://..." },]} addLabel="Add Faculty" /></div>);
    case "hostel":
      return (<div className="space-y-3"><div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px] text-muted-foreground">Campus Size</Label><Input value={data.campus_size || ""} onChange={(e) => onChange({ ...data, campus_size: e.target.value })} placeholder="300 acres" className="h-8 text-sm" /></div><div><Label className="text-[10px] text-muted-foreground">Total Students</Label><Input value={data.total_students || ""} onChange={(e) => onChange({ ...data, total_students: e.target.value })} placeholder="1500+" className="h-8 text-sm" /></div><div><Label className="text-[10px] text-muted-foreground">Hostel Rooms</Label><Input value={data.hostel_rooms || ""} onChange={(e) => onChange({ ...data, hostel_rooms: e.target.value })} placeholder="Single & Double" className="h-8 text-sm" /></div><div><Label className="text-[10px] text-muted-foreground">Library</Label><Input value={data.library || ""} onChange={(e) => onChange({ ...data, library: e.target.value })} placeholder="24/7, 50K+ books" className="h-8 text-sm" /></div></div><Label className="text-xs font-semibold text-muted-foreground">Campus Facilities</Label><ListEditor items={data.facilities || []} onChange={(items) => onChange({ ...data, facilities: items })} fields={[{ key: "name", label: "Facility", placeholder: "Wi-Fi Campus" }]} addLabel="Add Facility" /><div><Label className="text-xs font-semibold text-muted-foreground">Additional Details</Label><RichTextEditor content={content} onChange={onContentChange} placeholder="More about campus life..." /></div></div>);
    case "qa":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">FAQ Items</Label><ListEditor items={data.questions || []} onChange={(items) => onChange({ ...data, questions: items })} fields={[{ key: "question", label: "Question", placeholder: "What is the fee structure?" },{ key: "answer", label: "Answer", placeholder: "The total program fees...", type: "textarea" },]} addLabel="Add FAQ" /></div>);
    case "why_join":
      return (<div className="space-y-3"><div><Label className="text-xs font-semibold text-muted-foreground">Why Join Description</Label><RichTextEditor content={content} onChange={onContentChange} placeholder="Reasons to join this college..." /></div><Label className="text-xs font-semibold text-muted-foreground">Rating Aspects</Label><ListEditor items={data.ratings || []} onChange={(items) => onChange({ ...data, ratings: items })} fields={[{ key: "label", label: "Aspect", placeholder: "Academics" },{ key: "score", label: "Score (out of 5)", placeholder: "4.5" },]} addLabel="Add Rating Aspect" /></div>);
    case "quick_info":
      return (<div className="space-y-3"><Label className="text-xs font-semibold text-muted-foreground">Sidebar Info Items</Label><ListEditor items={data.items || []} onChange={(items) => onChange({ ...data, items: items })} fields={[{ key: "label", label: "Label", placeholder: "Location" },{ key: "value", label: "Value", placeholder: "Mumbai, Maharashtra" },]} addLabel="Add Info Item" /></div>);
    case "news":
      return (<div className="space-y-3"><p className="text-sm text-muted-foreground">News articles are automatically pulled from the Articles section. You can optionally add custom links here.</p><ListEditor items={data.links || []} onChange={(items) => onChange({ ...data, links: items })} fields={[{ key: "title", label: "Title", placeholder: "CAT 2025 Results Out" },{ key: "url", label: "URL", placeholder: "/article/cat-2025-results" },{ key: "date", label: "Date", placeholder: "2025-12-15" },]} addLabel="Add News Link" /></div>);
    default:
      return (<div><Label className="text-xs font-semibold text-muted-foreground">Content</Label><RichTextEditor content={content} onChange={onContentChange} placeholder="Section content..." /></div>);
  }
};

const AdminCollegeSections = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [colleges, setColleges] = useState<{ id: string; name: string; slug?: string | null; city?: string | null; state?: string | null; type?: string | null; tier?: string | null; established?: number | null }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);

  const { filters, setFilter, clearAll, activeCount } = useAdminFilters({
    storageKey: "admin.collegeSections.filters",
    defaults: { search: "", college: "all", section: "all" },
  });
  const selectedCollege = filters.college === "all" ? "" : filters.college;
  const [aiBusy, setAiBusy] = useState<string | null>(null); // section_type currently generating, or "form" / "bulk:<id>"
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; ok: number; fail: number; current: string; results: { type: string; label: string; status: "pending" | "ok" | "fail"; error?: string }[] } | null>(null);
  const { toast } = useToast();

  const fetchColleges = async () => { const { data } = await supabase.from("colleges").select("id, name, slug, city, state, type, tier, established").order("name"); if (data) setColleges(data); };
  const fetchSections = async () => { const query = supabase.from("college_sections").select("*, colleges(name, slug, city, state)").order("sort_order"); const { data } = selectedCollege ? await query.eq("college_id", selectedCollege) : await query; if (data) setSections(data); };

  // Extract a college slug from a pasted URL or raw slug. Examples:
  //   "https://mbacompass.in/college/iim-bangalore" -> "iim-bangalore"
  //   "/college/iim-bangalore"                     -> "iim-bangalore"
  //   "iim-bangalore"                              -> "iim-bangalore"
  const extractCollegeSlug = (raw: string): string | null => {
    const t = raw.trim();
    if (!t) return null;
    const urlMatch = t.match(/\/college\/([a-z0-9-]+)/i);
    if (urlMatch) return urlMatch[1].toLowerCase();
    // bare slug heuristic: lowercase letters/numbers/hyphens, has at least one hyphen, no spaces
    if (/^[a-z0-9-]+$/i.test(t) && t.includes("-")) return t.toLowerCase();
    return null;
  };

  // Auto-resolve pasted URL/slug OR a typed college name in the search box -> apply college filter.
  // This lets admins find a college (e.g. "IIM Bangalore") even if it has zero sections yet.
  useEffect(() => {
    const raw = (filters.search || "").trim();
    if (!raw || !colleges.length) return;

    // 1. URL / slug paste
    const slug = extractCollegeSlug(raw);
    if (slug) {
      const match = colleges.find((c) => (c.slug || "").toLowerCase() === slug);
      if (match && filters.college !== match.id) {
        setFilter("college", match.id);
        setFilter("search", "");
        toast({ title: "College selected", description: match.name });
        return;
      }
    }

    // 2. Typed name match — only auto-select on an exact (case-insensitive) full name match
    //    so we don't hijack partial typing. Partial matches still work via the dropdown
    //    suggestions below the search box.
    const lower = raw.toLowerCase();
    const exact = colleges.find(
      (c) => (c.name || "").toLowerCase() === lower || (c.slug || "").toLowerCase() === lower,
    );
    if (exact && filters.college !== exact.id) {
      setFilter("college", exact.id);
      setFilter("search", "");
      toast({ title: "College selected", description: exact.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, colleges]);

  // Suggestions: when the user is typing a college name and there are no matching sections yet,
  // show a small dropdown of colleges that match by name/city/slug so they can jump to one.
  const collegeSuggestions = useMemo(() => {
    const q = (filters.search || "").trim().toLowerCase();
    if (q.length < 2 || filters.college !== "all") return [];
    return colleges
      .filter((c) => {
        const hay = [c.name, c.city, c.state, c.slug].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [filters.search, filters.college, colleges]);

  const filteredSections = useMemo(() => {
    const search = (filters.search || "").trim().toLowerCase();
    const sectionType = filters.section;
    return sections.filter((s) => {
      if (sectionType && sectionType !== "all" && s.section_type !== sectionType) return false;
      if (!search) return true;
      const c = (s as any).colleges || {};
      const hay = [
        s.title,
        s.content,
        c.name,
        c.city,
        c.state,
        c.slug,
        SECTION_TYPES.find((t) => t.value === s.section_type)?.label,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(search);
    });
  }, [sections, filters.search, filters.section]);

  // Fetch the FULL college row so we can pass shared anchor facts (established year, ranking,
  // fees, placements, exams, accreditations) into every section call. This keeps the same
  // facts consistent across every generated section for one college.
  const fetchAnchorFacts = async (collegeId: string) => {
    const { data } = await supabase
      .from("colleges")
      .select("established, ranking, fees, fees_lakhs, placement_avg, placement_highest, placement_median, exams_accepted, accreditations")
      .eq("id", collegeId)
      .maybeSingle();
    const cy = new Date().getFullYear();
    return {
      ...(data || {}),
      admission_cycle: `${cy}-${cy + 1}`,
    };
  };

  useEffect(() => { fetchColleges(); }, []);
  useEffect(() => { fetchSections(); }, [selectedCollege]);

  const [searchParams, setSearchParams] = useSearchParams();
  // Auto-select college from ?college= and auto-open ?section=<id>
  useEffect(() => {
    const collegeParam = searchParams.get("college");
    if (collegeParam && collegeParam !== selectedCollege) {
      setFilter("college", collegeParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  useEffect(() => {
    const sectionParam = searchParams.get("section");
    if (!sectionParam || !sections.length || showForm) return;
    handleEdit(sectionParam);
    const next = new URLSearchParams(searchParams);
    next.delete("section");
    next.delete("college");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, searchParams]);

  const generateForSection = async (collegeId: string, sectionType: string, anchorFacts?: any) => {
    const college = colleges.find(c => c.id === collegeId);
    if (!college) throw new Error("College not found");
    const facts = anchorFacts || await fetchAnchorFacts(collegeId);
    const cy = new Date().getFullYear();
    const { data, error } = await supabase.functions.invoke("ai-college-section", {
      body: {
        collegeId,
        collegeName: college.name,
        city: college.city,
        state: college.state,
        type: college.type,
        tier: college.tier,
        established: college.established,
        sectionType,
        anchorFacts: facts,
        factSafety: true,
        freshnessWindow: `${cy - 1}-${cy + 1}`,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (!data?.section) throw new Error("AI returned empty response");
    return data.section as { title: string | null; content: string; data: any };
  };

  const handleAIFillForm = async () => {
    if (!form.college_id) { toast({ title: "Select a college first", variant: "destructive" }); return; }
    setAiBusy("form");
    try {
      const sec = await generateForSection(form.college_id, form.section_type);
      setForm(prev => ({ ...prev, title: sec.title || prev.title, content: sec.content || "", data: sec.data || {} }));
      toast({ title: "AI content loaded", description: "Review and click Update/Create to save." });
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setAiBusy(null);
    }
  };

  // Generate AI for a single row — writes to a SEPARATE ai_v1 row, never modifies the original
  const handleAIGenerateRow = async (row: any) => {
    setAiBusy(`row:${row.id}`);
    try {
      const sec = await generateForSection(row.college_id, row.section_type);
      // upsert ai_v1 row: original (or any other version) is never touched
      const { data: existingAi } = await supabase
        .from("college_sections")
        .select("id")
        .eq("college_id", row.college_id)
        .eq("section_type", row.section_type)
        .eq("version", "ai_v1")
        .maybeSingle();
      if (existingAi?.id) {
        const { error } = await supabase.from("college_sections").update({
          title: sec.title || row.title,
          content: sec.content || null,
          data: sec.data || {},
          is_active: true,
          source: "ai",
        }).eq("id", existingAi.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("college_sections").insert({
          college_id: row.college_id,
          section_type: row.section_type,
          title: sec.title || row.title,
          content: sec.content || null,
          data: sec.data || {},
          sort_order: (row.sort_order ?? 0) + 1,
          version: "ai_v1",
          is_active: true,
          source: "ai",
          parent_section_id: row.version === "original" ? row.id : (row.parent_section_id || null),
        });
        if (error) throw error;
      }
      toast({ title: "AI version created", description: "Original section preserved — AI extension saved as a separate version." });
      fetchSections();
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setAiBusy(null);
    }
  };

  const handleAIGenerateAll = async () => {
    if (!selectedCollege) { toast({ title: "Select a college first", variant: "destructive" }); return; }
    if (!confirm("Generate AI versions for ALL section types? Original sections will be preserved — AI content is saved as a separate version (ai_v1).")) return;
    setAiBusy("bulk");
    try {
      // Build the working list from SECTION_TYPES so every type gets an AI version,
      // even if an original row doesn't yet exist (we'll create the AI version standalone).
      const sharedFacts = await fetchAnchorFacts(selectedCollege);
      const list = SECTION_TYPES.map((t, i) => ({
        section_type: t.value,
        label: t.label,
        sort_order: i * 10,
      }));

      setBulkProgress({
        total: list.length,
        done: 0,
        ok: 0,
        fail: 0,
        current: "",
        results: list.map(r => ({ type: r.section_type, label: r.label, status: "pending" })),
      });

      let ok = 0, fail = 0;
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        setBulkProgress(prev => prev ? { ...prev, current: item.label } : prev);
        try {
          const sec = await generateForSection(selectedCollege, item.section_type, sharedFacts);
          // Find original (for parent reference + sort order) and existing AI version
          const { data: original } = await supabase.from("college_sections")
            .select("id, sort_order, title, content").eq("college_id", selectedCollege)
            .eq("section_type", item.section_type).eq("version", "original").maybeSingle();
          const { data: existingAi } = await supabase.from("college_sections")
            .select("id, title, content").eq("college_id", selectedCollege)
            .eq("section_type", item.section_type).eq("version", "ai_v1").maybeSingle();
          const sortBase = original?.sort_order ?? item.sort_order;
          if (existingAi?.id) {
            await supabase.from("college_sections").update({
              title: sec.title || existingAi.title || item.label,
              content: sec.content || null,
              data: sec.data || {},
              is_active: true,
              source: "ai",
            }).eq("id", existingAi.id);
          } else {
            await supabase.from("college_sections").insert({
              college_id: selectedCollege,
              section_type: item.section_type,
              title: sec.title || item.label,
              content: sec.content || null,
              data: sec.data || {},
              sort_order: sortBase + 1,
              version: "ai_v1",
              is_active: true,
              source: "ai",
              parent_section_id: original?.id || null,
            });
          }
          ok++;
          setBulkProgress(prev => {
            if (!prev) return prev;
            const results = [...prev.results];
            results[i] = { ...results[i], status: "ok" };
            return { ...prev, done: prev.done + 1, ok: prev.ok + 1, results };
          });
        } catch (err: any) {
          console.error("bulk fail for", item.section_type, err);
          fail++;
          setBulkProgress(prev => {
            if (!prev) return prev;
            const results = [...prev.results];
            results[i] = { ...results[i], status: "fail", error: err?.message || "Failed" };
            return { ...prev, done: prev.done + 1, fail: prev.fail + 1, results };
          });
        }
        await new Promise(r => setTimeout(r, 800));
      }
      toast({ title: "Bulk AI generation complete", description: `${ok} succeeded, ${fail} failed. Originals preserved.` });
      fetchSections();
    } catch (e: any) {
      toast({ title: "Bulk generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setAiBusy(null);
      setTimeout(() => setBulkProgress(null), 30000);
    }
  };

  const handleSave = async () => {
    if (!form.college_id) { toast({ title: "Select a college", variant: "destructive" }); return; }
    const payload = { college_id: form.college_id, section_type: form.section_type, title: form.title || null, content: form.content || null, data: form.data || {}, sort_order: form.sort_order };
    if (editId) {
      const { error } = await supabase.from("college_sections").update(payload).eq("id", editId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Section updated" });
    } else {
      const { error } = await supabase.from("college_sections").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Section created" });
    }
    setShowForm(false); setForm(emptyForm); setEditId(null); fetchSections();
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("college_sections").select("*").eq("id", id).single();
    if (data) { setForm({ college_id: data.college_id, section_type: data.section_type, title: data.title ?? "", content: data.content ?? "", data: data.data ?? {}, sort_order: data.sort_order ?? 0 }); setEditId(id); setShowForm(true); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("college_sections").delete().eq("id", id);
    fetchSections(); toast({ title: "Section deleted" });
  };

  const handleQuickAdd = async () => {
    if (!selectedCollege) { toast({ title: "Select a college first", variant: "destructive" }); return; }
    const existingTypes = sections.filter(s => s.college_id === selectedCollege).map(s => s.section_type);
    const missing = SECTION_TYPES.filter(t => !existingTypes.includes(t.value));
    if (missing.length === 0) { toast({ title: "All sections already exist" }); return; }
    const inserts = missing.map((t, i) => ({ college_id: selectedCollege, section_type: t.value, title: t.label, sort_order: (existingTypes.length + i) * 10, data: {} }));
    const { error } = await supabase.from("college_sections").insert(inserts);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Added ${missing.length} sections` }); fetchSections();
  };

  if (showForm) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => { setShowForm(false); setForm(emptyForm); setEditId(null); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sections
        </Button>
        <Card>
          <CardHeader><CardTitle>{editId ? "Edit" : "Add"} College Section</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">College *</Label>
                <select className="w-full border border-border rounded-md p-2 text-sm bg-background" value={form.college_id} onChange={(e) => setForm({ ...form, college_id: e.target.value })}>
                  <option value="">Choose college...</option>
                  {colleges.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Section Type</Label>
                <Select value={form.section_type} onValueChange={(v) => setForm({ ...form, section_type: v, data: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SECTION_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Section Title (optional override)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={handleAIFillForm} disabled={aiBusy === "form" || !form.college_id}>
                {aiBusy === "form" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate this section via AI</>}
              </Button>
            </div>
            <div className="border border-border rounded-lg p-4 bg-muted/10">
              <h3 className="text-sm font-semibold text-foreground mb-3">{SECTION_TYPES.find(t => t.value === form.section_type)?.label} — Content Editor</h3>
              <SectionFormRenderer type={form.section_type} data={form.data} onChange={(d) => setForm({ ...form, data: d })} content={form.content} onContentChange={(c) => setForm({ ...form, content: c })} />
            </div>
            <Input type="number" placeholder="Sort order" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"} Section</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold text-foreground">College Sections</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <a href="/admin/college-sections/bulk-generate">
              <Sparkles className="w-4 h-4 mr-1" /> Bulk Generate (Paste Names)
            </a>
          </Button>
          {selectedCollege && (
            <Button variant="outline" onClick={handleAIGenerateAll} disabled={aiBusy === "bulk"}>
              {aiBusy === "bulk" ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating AI versions…</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate AI version of ALL sections</>}
            </Button>
          )}
          {selectedCollege && (<Button variant="outline" onClick={handleQuickAdd}><Plus className="w-4 h-4 mr-1" /> Quick Add All Missing</Button>)}
          <Button onClick={() => { setForm({ ...emptyForm, college_id: selectedCollege }); setEditId(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Section
          </Button>
        </div>
      </div>

      {bulkProgress && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {aiBusy === "bulk" ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <CheckCircle2 className="w-4 h-4 text-primary" />}
                <span className="text-sm font-semibold text-foreground">
                  {aiBusy === "bulk" ? "Generating AI content…" : "Generation complete"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">{bulkProgress.done} / {bulkProgress.total}</span>
                <span className="text-emerald-600 font-medium">✓ {bulkProgress.ok}</span>
                {bulkProgress.fail > 0 && <span className="text-destructive font-medium">✕ {bulkProgress.fail}</span>}
                <span className="font-bold text-primary">{Math.round((bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100)}%</span>
                {aiBusy !== "bulk" && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setBulkProgress(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <Progress value={(bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100} className="h-2" />
            {bulkProgress.current && aiBusy === "bulk" && (
              <p className="text-xs text-muted-foreground">Currently generating: <span className="font-medium text-foreground">{bulkProgress.current}</span></p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pt-1">
              {bulkProgress.results.map((r, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-background/60 border border-border/50">
                  {r.status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                  {r.status === "fail" && <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                  {r.status === "pending" && (bulkProgress.current === r.label && aiBusy === "bulk"
                    ? <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />
                    : <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />)}
                  <span className={`truncate ${r.status === "fail" ? "text-destructive" : "text-foreground"}`} title={r.error || r.label}>{r.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AdminFilterBar
        searchValue={filters.search}
        onSearchChange={(v) => setFilter("search", v)}
        searchPlaceholder="Search by college name, city, slug, or paste college URL…"
        values={filters}
        onFilterChange={setFilter}
        onClearAll={clearAll}
        activeCount={activeCount}
        filters={[
          {
            type: "select",
            key: "college",
            label: "College",
            width: "w-56",
            options: [{ label: "All Colleges", value: "all" }, ...colleges.map((c) => ({ label: c.name, value: c.id }))],
          },
          {
            type: "select",
            key: "section",
            label: "Section Type",
            width: "w-52",
            options: [{ label: "All Sections", value: "all" }, ...SECTION_TYPES.map((s) => ({ label: s.label, value: s.value }))],
          },
        ]}
        resultsHint={`${filteredSections.length} of ${sections.length} sections`}
      />

      {collegeSuggestions.length > 0 && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Matching colleges — click to view their sections
            </div>
            <div className="flex flex-wrap gap-2">
              {collegeSuggestions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setFilter("college", c.id);
                    setFilter("search", "");
                  }}
                  className="text-left px-3 py-1.5 rounded-md border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                >
                  <div className="text-sm font-medium text-foreground">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {[c.city, c.state].filter(Boolean).join(", ") || c.slug}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>College</TableHead><TableHead>Section</TableHead><TableHead>Version</TableHead><TableHead>Title</TableHead><TableHead>Active</TableHead><TableHead>Order</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredSections.map((s) => (
                <TableRow key={s.id} className={s.version && s.version !== "original" ? "bg-primary/[0.03]" : ""}>
                  <TableCell className="font-medium">{(s as any).colleges?.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{SECTION_TYPES.find((t) => t.value === s.section_type)?.label || s.section_type}</Badge></TableCell>
                  <TableCell>
                    {s.version === "original" || !s.version ? (
                      <Badge variant="secondary" className="text-[10px]">Original</Badge>
                    ) : (
                      <Badge className="text-[10px] bg-primary/15 text-primary hover:bg-primary/15"><Sparkles className="w-2.5 h-2.5 mr-1" />{s.version.toUpperCase()}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{s.title || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="sm" className="h-7 px-2 text-xs"
                      onClick={async () => {
                        await supabase.from("college_sections").update({ is_active: !s.is_active }).eq("id", s.id);
                        toast({ title: !s.is_active ? "Section activated" : "Section hidden" });
                        fetchSections();
                      }}
                    >
                      {s.is_active === false ? <XCircle className="w-3.5 h-3.5 text-muted-foreground" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </Button>
                  </TableCell>
                  <TableCell>{s.sort_order}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleAIGenerateRow(s)} disabled={aiBusy === `row:${s.id}`} title="Generate / refresh AI version (original is preserved)">
                      {aiBusy === `row:${s.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-primary" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s.id)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSections.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{sections.length === 0 ? 'No sections yet. Select a college and click "Quick Add All Missing" to scaffold all sections.' : "No sections match the current filters."}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCollegeSections;
