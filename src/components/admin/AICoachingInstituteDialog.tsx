import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [primaryKeyword, setPrimaryKeyword] = useState(defaults?.primaryKeyword || "");
  const [secondary, setSecondary] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast({ title: "Institute name is required", variant: "destructive" });
    setLoading(true);
    try {
      const brief = {
        name: name.trim(),
        website: website.trim() || undefined,
        city: city || undefined,
        state: state || undefined,
        primaryKeyword: primaryKeyword.trim() || `${name.trim()} coaching${city ? ` in ${city}` : ""}`,
        secondaryKeywords: secondary,
        instituteType: (city ? "city" : "hybrid") as "city" | "hybrid",
        mode: city ? "Offline" : "Hybrid",
      };
      const { data, error } = await supabase.functions.invoke("ai-coaching-institute-generate", { body: brief });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onGenerated({ basic: data.basic, sections: data.sections, brief });
      onOpenChange(false);
      toast({ title: "Generated", description: "Profile saved. AI SEO ready to run." });
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
          <DialogDescription>
            Just tell us the basics. AI researches the institute and writes the entire profile — overview, courses, faculty, fees, results, FAQs, and SEO meta. Empty fields stay hidden on the live page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Institute Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. IMS Learning Resources" />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Official Website (optional)</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://imsindia.com" />
            </div>
            <div>
              <Label>Primary Keyword (optional)</Label>
              <Input value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} placeholder={`Best CAT coaching${city ? ` in ${city}` : ""}`} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Location (optional — leave blank for online / pan-India)</Label>
            <StateCitySelect state={state} city={city} onStateChange={(s) => { setState(s); setCity(""); }} onCityChange={setCity} showLabels={false} />
          </div>
          <div>
            <Label>Secondary Keywords (optional)</Label>
            <ChipInput values={secondary} onChange={setSecondary} placeholder="e.g. CAT classroom coaching, NMAT prep" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              Generate Full Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AICoachingInstituteDialog;
