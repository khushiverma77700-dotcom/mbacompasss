import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Check, Copy, Lightbulb, Link, Code, Tag, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SEOSuggestions {
  meta_title: string;
  meta_description: string;
  h1_tag: string;
  keywords: {
    primary: string[];
    longTail: string[];
    faq: string[];
    trending: string[];
  };
  onPageTips: string[];
  schemaMarkup: Record<string, any>;
  internalLinks: string[];
  contentSuggestions: string[];
}

interface AISEOButtonProps {
  contentType: "article" | "institute" | "college" | "exam" | "cityPage";
  data: Record<string, any>;
  onApply: (suggestions: Partial<{
    meta_title: string;
    meta_description: string;
    h1_tag: string;
    keywords: string[];
  }>) => void;
}

export const AISEOButton = ({ contentType, data, onApply }: AISEOButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SEOSuggestions | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    meta_title: true, meta_description: true, h1_tag: true, keywords: true,
  });
  const { toast } = useToast();

  const analyze = async () => {
    setLoading(true);
    setSuggestions(null);
    try {
      const { data: result, error } = await supabase.functions.invoke("ai-seo-enhance", {
        body: { contentType, data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setSuggestions(result.suggestions);
    } catch (e: any) {
      toast({ title: "AI SEO Error", description: e.message || "Failed to analyze", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestions) return;
    const applied: any = {};
    if (selected.meta_title) applied.meta_title = suggestions.meta_title;
    if (selected.meta_description) applied.meta_description = suggestions.meta_description;
    if (selected.h1_tag) applied.h1_tag = suggestions.h1_tag;
    if (selected.keywords) {
      applied.keywords = [
        ...suggestions.keywords.primary,
        ...suggestions.keywords.longTail,
        ...suggestions.keywords.trending,
      ];
    }
    onApply(applied);
    toast({ title: "SEO Applied", description: "Selected suggestions have been applied to the form." });
    setOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen(true); if (!suggestions) analyze(); }}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
      >
        <Sparkles className="h-4 w-4" />
        AI SEO
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI SEO Suggestions
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing content & researching keywords...</p>
            </div>
          )}

          {suggestions && (
            <ScrollArea className="max-h-[65vh]">
              <Tabs defaultValue="meta" className="w-full">
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="meta" className="text-xs">Meta</TabsTrigger>
                  <TabsTrigger value="keywords" className="text-xs">Keywords</TabsTrigger>
                  <TabsTrigger value="tips" className="text-xs">Tips</TabsTrigger>
                  <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
                  <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
                </TabsList>

                <TabsContent value="meta" className="space-y-4 mt-4">
                  <SuggestionField
                    label="Meta Title"
                    value={suggestions.meta_title}
                    charLimit={60}
                    checked={selected.meta_title}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, meta_title: !!v }))}
                    onCopy={copyToClipboard}
                  />
                  <SuggestionField
                    label="Meta Description"
                    value={suggestions.meta_description}
                    charLimit={155}
                    checked={selected.meta_description}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, meta_description: !!v }))}
                    onCopy={copyToClipboard}
                  />
                  <SuggestionField
                    label="H1 Tag"
                    value={suggestions.h1_tag}
                    checked={selected.h1_tag}
                    onCheckedChange={(v) => setSelected(s => ({ ...s, h1_tag: !!v }))}
                    onCopy={copyToClipboard}
                  />
                </TabsContent>

                <TabsContent value="keywords" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      checked={selected.keywords}
                      onCheckedChange={(v) => setSelected(s => ({ ...s, keywords: !!v }))}
                    />
                    <span className="text-sm font-medium">Apply all keywords to form</span>
                  </div>

                  <KeywordGroup title="Primary Keywords" icon={<Tag className="h-4 w-4" />} keywords={suggestions.keywords.primary} color="bg-primary/10 text-primary" />
                  <KeywordGroup title="Long-tail Keywords" icon={<Search className="h-4 w-4" />} keywords={suggestions.keywords.longTail} color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" />
                  <KeywordGroup title="FAQ Keywords" icon={<Lightbulb className="h-4 w-4" />} keywords={suggestions.keywords.faq} color="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" />
                  <KeywordGroup title="Trending Keywords" icon={<Sparkles className="h-4 w-4" />} keywords={suggestions.keywords.trending} color="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" />
                </TabsContent>

                <TabsContent value="tips" className="space-y-3 mt-4">
                  <h4 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> On-Page SEO Tips</h4>
                  {suggestions.onPageTips.map((tip, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}

                  <h4 className="font-semibold mt-4">Content Suggestions</h4>
                  {suggestions.contentSuggestions.map((s, i) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="schema" className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold flex items-center gap-2"><Code className="h-4 w-4" /> JSON-LD Schema</h4>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(JSON.stringify(suggestions.schemaMarkup, null, 2))}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-80">
                    {JSON.stringify(suggestions.schemaMarkup, null, 2)}
                  </pre>
                </TabsContent>

                <TabsContent value="links" className="mt-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><Link className="h-4 w-4" /> Internal Linking Suggestions</h4>
                  {suggestions.internalLinks.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                      <Link className="h-3 w-3 text-primary shrink-0" />
                      <code className="text-xs">{link}</code>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t sticky bottom-0 bg-background pb-2">
                <Button variant="outline" onClick={() => analyze()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Re-analyze
                </Button>
                <Button onClick={handleApply} className="gap-2">
                  <Check className="h-4 w-4" /> Apply Selected
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

function SuggestionField({ label, value, charLimit, checked, onCheckedChange, onCopy }: {
  label: string; value: string; charLimit?: number; checked: boolean;
  onCheckedChange: (v: boolean | "indeterminate") => void; onCopy: (v: string) => void;
}) {
  const isOverLimit = charLimit && value.length > charLimit;
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {charLimit && (
            <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {value.length}/{charLimit}
            </span>
          )}
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onCopy(value)}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="text-sm bg-muted/50 p-2 rounded">{value}</p>
    </div>
  );
}

function KeywordGroup({ title, icon, keywords, color }: {
  title: string; icon: React.ReactNode; keywords: string[]; color: string;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">{icon} {title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw, i) => (
          <Badge key={i} variant="secondary" className={`text-xs ${color}`}>{kw}</Badge>
        ))}
      </div>
    </div>
  );
}

export default AISEOButton;
