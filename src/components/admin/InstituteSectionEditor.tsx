import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import FileUpload from "@/components/admin/FileUpload";
import type { FieldDef, SectionDef } from "@/lib/instituteSections";
import { emptySectionData, isSectionEmpty } from "@/lib/instituteSections";

interface Props {
  def: SectionDef;
  enabled: boolean;
  data: any;
  onChange: (next: { enabled: boolean; data: any }) => void;
  defaultOpen?: boolean;
}

const InstituteSectionEditor = ({ def, enabled, data, onChange, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const safeData = Object.keys(data || {}).length ? data : emptySectionData(def);
  const empty = isSectionEmpty(def, safeData);

  const setField = (key: string, value: any) =>
    onChange({ enabled, data: { ...safeData, [key]: value } });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-left flex-1">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <div>
              <div className="font-semibold text-sm">{def.label}</div>
              <div className="text-xs text-muted-foreground">{def.shortHelp}</div>
            </div>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            {!empty && <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Has data</span>}
            <Label className="text-xs text-muted-foreground">Show on site</Label>
            <Switch checked={enabled} onCheckedChange={(v) => onChange({ enabled: v, data: safeData })} />
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-4">
          {def.fields.map((f) => (
            <FieldRenderer key={f.key} def={f} value={safeData[f.key]} onChange={(v) => setField(f.key, v)} />
          ))}
        </CardContent>
      )}
    </Card>
  );
};

const FieldRenderer = ({ def, value, onChange }: { def: FieldDef; value: any; onChange: (v: any) => void }) => {
  switch (def.kind) {
    case "text":
      return (
        <div>
          <Label>{def.label}</Label>
          <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} />
        </div>
      );
    case "url":
      return (
        <div>
          <Label>{def.label}</Label>
          <Input type="url" value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder || "https://..."} />
        </div>
      );
    case "textarea":
      return (
        <div>
          <Label>{def.label}</Label>
          <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={def.rows || 4} />
        </div>
      );
    case "richtext":
      return (
        <div>
          <Label>{def.label}</Label>
          <RichTextEditor content={value ?? ""} onChange={onChange} />
        </div>
      );
    case "image":
      return (
        <div>
          <Label>{def.label}</Label>
          <FileUpload value={value ?? ""} onChange={onChange} bucket="uploads" />
        </div>
      );
    case "list-bullet":
    case "list-string":
      return <ListString label={def.label} value={value || []} onChange={onChange} />;
    case "list-keyvalue":
      return <ListKV value={value || []} onChange={onChange} />;
    case "list-faculty":
      return <ListFaculty value={value || []} onChange={onChange} />;
    case "list-testimonial":
      return <ListTestimonial value={value || []} onChange={onChange} />;
    case "list-review":
      return <ListReview value={value || []} onChange={onChange} />;
    case "list-faq":
      return <ListFAQ value={value || []} onChange={onChange} />;
    case "list-update":
      return <ListUpdate value={value || []} onChange={onChange} />;
    case "list-event":
      return <ListEvent value={value || []} onChange={onChange} />;
    case "list-link":
      return <ListLink value={value || []} onChange={onChange} />;
    case "list-location":
      return <ListLocation value={value || []} onChange={onChange} />;
    case "list-comparison":
      return <ListComparison value={value || []} onChange={onChange} />;
    case "list-pros-cons":
      return <ProsConsEditor value={value || { pros: [], cons: [] }} onChange={onChange} />;
    case "list-cta":
      return <ListCTA value={value || []} onChange={onChange} />;
    case "social-links":
      return <SocialLinks value={value || {}} onChange={onChange} />;
  }
  return null;
};

// ---------- list editors ----------
const RowWrap = ({ children, onRemove }: any) => (
  <div className="flex gap-2 items-start">
    <div className="flex-1 space-y-2">{children}</div>
    <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
      <Trash2 className="w-4 h-4 text-destructive" />
    </Button>
  </div>
);

const AddBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <Button type="button" variant="outline" size="sm" onClick={onClick} className="w-full">
    <Plus className="w-4 h-4 mr-1" /> {label}
  </Button>
);

const ListString = ({ label, value, onChange }: any) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {value.map((v: string, i: number) => (
      <RowWrap key={i} onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
        <Input value={v} onChange={(e) => onChange(value.map((x: string, j: number) => (j === i ? e.target.value : x)))} placeholder={`Item ${i + 1}`} />
      </RowWrap>
    ))}
    <AddBtn label="Add item" onClick={() => onChange([...value, ""])} />
  </div>
);

const ListKV = ({ value, onChange }: any) => (
  <div className="space-y-2">
    {value.map((row: any, i: number) => (
      <RowWrap key={i} onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Label (e.g. Phone)" value={row.label || ""} onChange={(e) => onChange(value.map((r: any, j: number) => (j === i ? { ...r, label: e.target.value } : r)))} />
          <Input className="col-span-2" placeholder="Value" value={row.value || ""} onChange={(e) => onChange(value.map((r: any, j: number) => (j === i ? { ...r, value: e.target.value } : r)))} />
        </div>
      </RowWrap>
    ))}
    <AddBtn label="Add row" onClick={() => onChange([...value, { label: "", value: "" }])} />
  </div>
);

const ListFaculty = ({ value, onChange }: any) => (
  <div className="space-y-3">
    {value.map((row: any, i: number) => (
      <Card key={i} className="p-3">
        <RowWrap onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Name" value={row.name || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, name: e.target.value } : r))} />
            <Input placeholder="Experience (e.g. 12 yrs)" value={row.experience || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, experience: e.target.value } : r))} />
            <Input className="md:col-span-2" placeholder="Expertise (e.g. Quant & DI)" value={row.expertise || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, expertise: e.target.value } : r))} />
            <Textarea className="md:col-span-2" rows={2} placeholder="Past achievements / bio (40–50 words)" value={row.achievements || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, achievements: e.target.value } : r))} />
            <div className="md:col-span-2">
              <Label className="text-xs">Photo</Label>
              <FileUpload value={row.photo_url || ""} onChange={(url) => onChange(value.map((r: any, j: number) => j === i ? { ...r, photo_url: url } : r))} />
            </div>
          </div>
        </RowWrap>
      </Card>
    ))}
    <AddBtn label="Add faculty" onClick={() => onChange([...value, { name: "", experience: "", expertise: "", achievements: "", photo_url: "" }])} />
  </div>
);

const ListTestimonial = ({ value, onChange }: any) => (
  <div className="space-y-3">
    {value.map((row: any, i: number) => (
      <Card key={i} className="p-3">
        <RowWrap onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Student name" value={row.name || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, name: e.target.value } : r))} />
            <Input placeholder="Exam (e.g. CAT 2024)" value={row.exam || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, exam: e.target.value } : r))} />
            <Textarea className="md:col-span-2" rows={2} placeholder="Story (20–30 words)" value={row.text || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, text: e.target.value } : r))} />
            <div className="md:col-span-2">
              <Label className="text-xs">Photo (optional)</Label>
              <FileUpload value={row.photo_url || ""} onChange={(url) => onChange(value.map((r: any, j: number) => j === i ? { ...r, photo_url: url } : r))} />
            </div>
          </div>
        </RowWrap>
      </Card>
    ))}
    <AddBtn label="Add testimonial" onClick={() => onChange([...value, { name: "", exam: "", text: "", photo_url: "" }])} />
  </div>
);

const ListReview = ({ value, onChange }: any) => (
  <div className="space-y-3">
    {value.map((row: any, i: number) => (
      <Card key={i} className="p-3">
        <RowWrap onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
          <div className="grid md:grid-cols-3 gap-2">
            <Input placeholder="Reviewer name" value={row.name || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, name: e.target.value } : r))} />
            <Input type="number" min={1} max={5} placeholder="Rating 1-5" value={row.rating || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, rating: Number(e.target.value) } : r))} />
            <Textarea className="md:col-span-3" rows={2} placeholder="Review text" value={row.text || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, text: e.target.value } : r))} />
          </div>
        </RowWrap>
      </Card>
    ))}
    <AddBtn label="Add review" onClick={() => onChange([...value, { name: "", rating: 5, text: "" }])} />
  </div>
);

const ListFAQ = ({ value, onChange }: any) => (
  <div className="space-y-3">
    {value.map((row: any, i: number) => (
      <Card key={i} className="p-3">
        <RowWrap onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
          <Input placeholder="Question" value={row.q || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, q: e.target.value } : r))} />
          <Textarea rows={3} placeholder="Answer (30–40 words)" value={row.a || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, a: e.target.value } : r))} />
        </RowWrap>
      </Card>
    ))}
    <AddBtn label="Add FAQ" onClick={() => onChange([...value, { q: "", a: "" }])} />
  </div>
);

const ListUpdate = ({ value, onChange }: any) => (
  <div className="space-y-3">
    {value.map((row: any, i: number) => (
      <Card key={i} className="p-3">
        <RowWrap onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
          <div className="grid md:grid-cols-3 gap-2">
            <Input type="date" value={row.date || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, date: e.target.value } : r))} />
            <Input className="md:col-span-2" placeholder="Title" value={row.title || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, title: e.target.value } : r))} />
            <Textarea className="md:col-span-3" rows={2} placeholder="Body" value={row.body || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, body: e.target.value } : r))} />
          </div>
        </RowWrap>
      </Card>
    ))}
    <AddBtn label="Add update" onClick={() => onChange([...value, { date: "", title: "", body: "" }])} />
  </div>
);

const ListEvent = ({ value, onChange }: any) => (
  <div className="space-y-3">
    {value.map((row: any, i: number) => (
      <Card key={i} className="p-3">
        <RowWrap onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
          <div className="grid md:grid-cols-3 gap-2">
            <Input type="date" value={row.date || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, date: e.target.value } : r))} />
            <Input className="md:col-span-2" placeholder="Title" value={row.title || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, title: e.target.value } : r))} />
            <Textarea className="md:col-span-3" rows={2} placeholder="Description" value={row.body || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, body: e.target.value } : r))} />
            <Input className="md:col-span-3" placeholder="Link (optional)" value={row.link || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, link: e.target.value } : r))} />
          </div>
        </RowWrap>
      </Card>
    ))}
    <AddBtn label="Add event" onClick={() => onChange([...value, { date: "", title: "", body: "", link: "" }])} />
  </div>
);

const ListLink = ({ value, onChange }: any) => (
  <div className="space-y-2">
    {value.map((row: any, i: number) => (
      <RowWrap key={i} onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
        <div className="grid md:grid-cols-2 gap-2">
          <Input placeholder="Label" value={row.label || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, label: e.target.value } : r))} />
          <Input placeholder="https://..." value={row.url || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, url: e.target.value } : r))} />
        </div>
      </RowWrap>
    ))}
    <AddBtn label="Add link" onClick={() => onChange([...value, { label: "", url: "" }])} />
  </div>
);

const ListLocation = ({ value, onChange }: any) => (
  <div className="space-y-2">
    {value.map((row: any, i: number) => (
      <RowWrap key={i} onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="City" value={row.city || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, city: e.target.value } : r))} />
          <Input placeholder="Area / Address" value={row.area || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, area: e.target.value } : r))} />
          <Input placeholder="Google Maps URL" value={row.map_url || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, map_url: e.target.value } : r))} />
        </div>
      </RowWrap>
    ))}
    <AddBtn label="Add center" onClick={() => onChange([...value, { city: "", area: "", map_url: "" }])} />
  </div>
);

const ListComparison = ({ value, onChange }: any) => (
  <div className="space-y-2">
    {value.map((row: any, i: number) => (
      <RowWrap key={i} onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Comparison point (e.g. Fees)" value={row.point || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, point: e.target.value } : r))} />
          <Input placeholder="Us" value={row.us || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, us: e.target.value } : r))} />
          <Input placeholder="Others" value={row.others || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, others: e.target.value } : r))} />
        </div>
      </RowWrap>
    ))}
    <AddBtn label="Add comparison" onClick={() => onChange([...value, { point: "", us: "", others: "" }])} />
  </div>
);

const ProsConsEditor = ({ value, onChange }: any) => (
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <Label className="text-emerald-700">Pros</Label>
      <ListString label="" value={value.pros || []} onChange={(pros: string[]) => onChange({ ...value, pros })} />
    </div>
    <div>
      <Label className="text-rose-700">Cons</Label>
      <ListString label="" value={value.cons || []} onChange={(cons: string[]) => onChange({ ...value, cons })} />
    </div>
  </div>
);

const ListCTA = ({ value, onChange }: any) => (
  <div className="space-y-2">
    {value.map((row: any, i: number) => (
      <RowWrap key={i} onRemove={() => onChange(value.filter((_: any, x: number) => x !== i))}>
        <div className="grid md:grid-cols-3 gap-2">
          <Input placeholder="Label (e.g. Enroll Now)" value={row.label || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, label: e.target.value } : r))} />
          <Input placeholder="URL or #form" value={row.url || ""} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, url: e.target.value } : r))} />
          <select className="border rounded px-2 py-1 text-sm" value={row.style || "primary"} onChange={(e) => onChange(value.map((r: any, j: number) => j === i ? { ...r, style: e.target.value } : r))}>
            <option value="primary">Primary</option>
            <option value="outline">Outline</option>
            <option value="ghost">Ghost</option>
          </select>
        </div>
      </RowWrap>
    ))}
    <AddBtn label="Add CTA" onClick={() => onChange([...value, { label: "", url: "", style: "primary" }])} />
  </div>
);

const SocialLinks = ({ value, onChange }: any) => {
  const fields = ["website", "youtube", "instagram", "linkedin", "facebook", "twitter"];
  return (
    <div className="grid md:grid-cols-2 gap-2">
      {fields.map((f) => (
        <div key={f}>
          <Label className="capitalize text-xs">{f}</Label>
          <Input placeholder={`https://${f}.com/...`} value={value[f] || ""} onChange={(e) => onChange({ ...value, [f]: e.target.value })} />
        </div>
      ))}
    </div>
  );
};

export default InstituteSectionEditor;
