import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Search, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { AISEOButton } from "@/components/admin/AISEOSuggestions";
import { useToast } from "@/hooks/use-toast";

type ContentType = "article" | "institute" | "college" | "exam" | "cityPage";

const contentTypes: { value: ContentType; label: string; table: string }[] = [
  { value: "article", label: "Articles", table: "articles" },
  { value: "institute", label: "Institutes", table: "institutes" },
  { value: "college", label: "Colleges", table: "colleges" },
  { value: "exam", label: "Exams", table: "exams" },
  { value: "cityPage", label: "City/State Pages", table: "city_pages" },
];

function getSEOScore(item: any): { score: number; status: "good" | "warning" | "poor" } {
  let score = 0;
  if (item.meta_title && item.meta_title.length > 10) score += 25;
  if (item.meta_description && item.meta_description.length > 20) score += 25;
  const keywords = item.keywords || [];
  if (keywords.length >= 3) score += 25;
  else if (keywords.length > 0) score += 10;
  if (item.h1_tag || item.name) score += 15;
  if (item.description || item.content || item.intro_content) score += 10;
  
  return {
    score: Math.min(score, 100),
    status: score >= 70 ? "good" : score >= 40 ? "warning" : "poor",
  };
}

const AdminSEODashboard = () => {
  const [selectedType, setSelectedType] = useState<ContentType>("article");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchItems = async (type: ContentType) => {
    setLoading(true);
    const config = contentTypes.find(c => c.value === type)!;
    const { data } = await supabase
      .from(config.table as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(selectedType); }, [selectedType]);

  const stats = {
    total: items.length,
    good: items.filter(i => getSEOScore(i).status === "good").length,
    warning: items.filter(i => getSEOScore(i).status === "warning").length,
    poor: items.filter(i => getSEOScore(i).status === "poor").length,
  };

  const handleApply = async (item: any, suggestions: any) => {
    const config = contentTypes.find(c => c.value === selectedType)!;
    const update: any = {};
    if (suggestions.meta_title) update.meta_title = suggestions.meta_title;
    if (suggestions.meta_description) update.meta_description = suggestions.meta_description;
    if (suggestions.h1_tag && selectedType === "article") update.h1_tag = suggestions.h1_tag;
    if (suggestions.keywords) update.keywords = suggestions.keywords;

    const { error } = await supabase.from(config.table as any).update(update).eq("id", item.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "SEO Updated", description: `${item.name || item.title} SEO fields updated.` });
      fetchItems(selectedType);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI SEO Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze and optimize SEO across all content types
          </p>
        </div>
        <Select value={selectedType} onValueChange={(v) => setSelectedType(v as ContentType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.map(ct => (
              <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.good}</p>
            <p className="text-xs text-muted-foreground">Good SEO</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{stats.warning}</p>
            <p className="text-xs text-muted-foreground">Needs Work</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.poor}</p>
            <p className="text-xs text-muted-foreground">Poor SEO</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Meta Title</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => {
                  const { score, status } = getSEOScore(item);
                  const name = item.name || item.title || "Untitled";
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {item.meta_title || <span className="text-destructive">Missing</span>}
                      </TableCell>
                      <TableCell>
                        {(item.keywords?.length || 0) > 0 ? (
                          <Badge variant="secondary" className="text-xs">{item.keywords.length} keywords</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {status === "good" && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          {status === "poor" && <XCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm font-medium">{score}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <AISEOButton
                          contentType={selectedType}
                          data={item}
                          onApply={(s) => handleApply(item, s)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSEODashboard;
