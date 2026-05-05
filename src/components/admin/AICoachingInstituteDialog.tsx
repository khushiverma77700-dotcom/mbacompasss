import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Plus, X } from "lucide-react";
import StateCitySelect from "@/components/admin/StateCitySelect";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaults?: { name?: string; city?: string; state?: string; website?: string; primaryKeyword?: string; instituteType?: "city" | "hybrid" };
  /** Returns generated payload so the parent decides what to do (insert vs merge into existing). */
  onGenerated: (payload: { basic: any; sections: Record<string, any>; brief: any }) => void;
}

const EXAM_DEFAULTS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT"];

const ChipInput = ({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) => {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setV("");
  };
  return (
    <div>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} />
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus className="w-3 h-3" /></Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((k) => (
            <Badge key={k} variant="secondary" className="gap-1 text-xs">
              {k}
              <button onClick={() => onChange(values.filter((x) => x !== k))} className="ml-0.5"><X className="w-3 h-3" /></button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

const AICoachingInstituteDialog = ({ open, onOpenChange, defaults, onGenerated }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState(defaults?.name || "");
  const [website, setWebsite] = useState(defaults?.website || "");
  const [city, setCity] = useState(defaults?.city || "");
  const [state, setState] = useState(defaults?.state || "");
  const [mode, setMode] = useState<string>("Hybrid");
  const [instituteType, setInstituteType] = useState<"city" | "hybrid">(defaults?.instituteType || "hybrid");
  const [primaryKeyword, setPrimaryKeyword] = useState(defaults?.primaryKeyword || "");
  const [secondary, setSecondary] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>(EXAM_DEFAULTS);
  const [flagship, setFlagship] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const showLocation = mode !== "Online"; // Online → no state/city; Offline required; Hybrid optional

  const submit = async () => {
    if (!name.trim()) return toast({ title: "Institute name is required", variant: "destructive" });
    if (!primaryKeyword.trim()) return toast({ title: "Primary keyword is required", variant: "destructive" });
    if (mode === "Offline" && (!state || !city)) {
      return toast({ title: "Offline mode requires state & city", variant: "destructive" });
    }
    setLoading(true);
    try {
      const cleanCity = mode === "Online" ? "" : city;
      const cleanState = mode === "Online" ? "" : state;
      const brief = {
        name: name.trim(), website: website.trim() || undefined,
        sourceUrl: sourceUrl.trim() || website.trim() || undefined,
        city: cleanCity || undefined, state: cleanState || undefined,
        mode, instituteType, primaryKeyword: primaryKeyword.trim(), secondaryKeywords: secondary,
        examFocus: exams, flagshipPrograms: flagship,
      };
      const { data, error } = await supabase.functions.invoke("ai-coaching-institute-generate", { body: brief });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onGenerated({ basic: data.basic, sections: data.sections, brief });
      onOpenChange(false);
      toast({ title: "Generated", description: "Review and edit before saving." });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Generate Coaching Institute via AI</DialogTitle>
          <DialogDescription>Tell us a few basics — AI will write the entire profile (overview, faculty, results, FAQs, SEO).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Institute Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. IMS Learning Resources" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://imsindia.com" />
            </div>
            <div>
              <Label>Primary Target Keyword *</Label>
              <Input value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} placeholder={`Best CAT coaching in ${city || "Mumbai"}`} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={instituteType} onValueChange={(v) => setInstituteType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">City-wise</SelectItem>
                  <SelectItem value="hybrid">Hybrid (pan-India)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <StateCitySelect state={state} city={city} onStateChange={(s) => { setState(s); setCity(""); }} onCityChange={setCity} showLabels />
          <div>
            <Label>Secondary Keywords</Label>
            <ChipInput values={secondary} onChange={setSecondary} placeholder="e.g. CAT classroom coaching, GMAT prep" />
          </div>
          <div>
            <Label>Exams Covered</Label>
            <ChipInput values={exams} onChange={setExams} placeholder="e.g. CAT, XAT" />
          </div>
          <div>
            <Label>Flagship Programs (optional)</Label>
            <ChipInput values={flagship} onChange={setFlagship} placeholder="e.g. AIMCAT Test Series" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Generate Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AICoachingInstituteDialog;
