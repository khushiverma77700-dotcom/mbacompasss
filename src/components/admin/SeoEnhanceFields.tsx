import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  validateTitle,
  validateMetaDescription,
  validateUrl,
  type ValidationResult,
} from "@/lib/seoValidators";

export interface SeoEnhanceData {
  primary_keyword?: string | null;
  funnel_stage?: string | null;
  cluster_id?: string | null;
  title?: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
}

interface Cluster { id: string; name: string }

interface Props {
  data: SeoEnhanceData;
  onChange: (patch: Partial<SeoEnhanceData>) => void;
  /** content type for FAQ generation */
  contentType?: "article" | "college" | "institute" | "exam" | "cityPage";
  recordId?: string;
}

const StatusIcon = ({ status }: { status: ValidationResult["status"] }) => {
  if (status === "pass") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
  if (status === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
  return <XCircle className="w-3.5 h-3.5 text-red-600" />;
};

const Chip = ({ label, result }: { label: string; result: ValidationResult }) => (
  <div
    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border ${
      result.status === "pass"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : result.status === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-red-200 bg-red-50 text-red-800"
    }`}
    title={result.message + (result.fix ? ` — ${result.fix}` : "")}
  >
    <StatusIcon status={result.status} />
    <span className="font-medium">{label}</span>
    <span className="opacity-70">{result.score}</span>
  </div>
);

const SeoEnhanceFields = ({ data, onChange, contentType, recordId }: Props) => {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("topic_clusters")
      .select("id,name")
      .order("name")
      .then(({ data }) => setClusters((data as Cluster[]) || []));
  }, []);

  const titleResult = validateTitle(data.meta_title || data.title, data.primary_keyword);
  const metaResult = validateMetaDescription(data.meta_description, data.primary_keyword);
  const urlResult = validateUrl(data.slug, data.primary_keyword);

  const generateFaqs = async () => {
    if (!contentType || !recordId) {
      toast({ title: "Save the page first", description: "FAQs need a saved record." });
      return;
    }
    setGenerating(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("auto-seo-engine", {
        body: { mode: "faq_generate", contentType, recordId },
      });
      if (error) throw error;
      toast({
        title: "FAQs generated",
        description: `${(res as any)?.faqs?.length || 0} FAQs saved to this page.`,
      });
    } catch (e: any) {
      toast({ title: "FAQ generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">AI SEO Enhancements</h4>
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white text-xs">
          New
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Primary Keyword
          </Label>
          <Input
            placeholder="e.g. best mba colleges in mumbai"
            value={data.primary_keyword || ""}
            onChange={(e) => onChange({ primary_keyword: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Funnel Stage
          </Label>
          <Select
            value={data.funnel_stage || "none"}
            onValueChange={(v) => onChange({ funnel_stage: v === "none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              <SelectItem value="tofu">TOFU (Awareness)</SelectItem>
              <SelectItem value="mofu">MOFU (Consideration)</SelectItem>
              <SelectItem value="bofu">BOFU (Decision)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
            Topic Cluster
          </Label>
          <Select
            value={data.cluster_id || "none"}
            onValueChange={(v) => onChange({ cluster_id: v === "none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign cluster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Unassigned —</SelectItem>
              {clusters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">Live Validation</div>
        <div className="flex flex-wrap gap-2">
          <Chip label="Title" result={titleResult} />
          <Chip label="Meta" result={metaResult} />
          <Chip label="URL" result={urlResult} />
        </div>
      </div>

      {contentType && (
        <div className="flex items-center justify-between border-t border-blue-100 pt-3">
          <div className="text-xs text-muted-foreground">
            Generate AI-powered FAQs and inject FAQ schema for AI search.
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generating || !recordId}
            onClick={generateFaqs}
            className="gap-1.5"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Generate FAQs
          </Button>
        </div>
      )}
    </div>
  );
};

export default SeoEnhanceFields;
