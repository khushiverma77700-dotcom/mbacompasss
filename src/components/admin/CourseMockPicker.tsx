import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

type Mock = {
  id: string;
  name: string;
  slug: string;
  exam_code: string | null;
  category: string | null;
  test_type: string | null;
  total_duration_minutes?: number | null;
  is_live?: boolean | null;
};

interface Props {
  selectedCategories: string[];
  selectedTestIds: string[];
  onTestIdsChange: (ids: string[]) => void;
}

const TYPE_TABS = [
  { value: "all", label: "All" },
  { value: "full_length", label: "Full-Length" },
  { value: "sectional", label: "Sectional" },
  { value: "topic_wise", label: "Topic-wise" },
  { value: "practice_set", label: "Practice Set" },
  { value: "daily", label: "Daily" },
];

export default function CourseMockPicker({ selectedCategories, selectedTestIds, onTestIdsChange }: Props) {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(selectedCategories[0] || "");
  const [activeType, setActiveType] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (selectedCategories.length && !selectedCategories.includes(activeCategory)) {
      setActiveCategory(selectedCategories[0]);
    }
  }, [selectedCategories, activeCategory]);

  useEffect(() => {
    if (!activeCategory) { setMocks([]); return; }
    setLoading(true);
    supabase
      .from("mock_tests")
      .select("id, name, slug, exam_code, category, total_duration_minutes, is_live")
      .eq("exam_code", activeCategory)
      .order("name")
      .then(({ data }) => {
        setMocks((data ?? []) as Mock[]);
        setLoading(false);
      });
  }, [activeCategory]);

  const filtered = useMemo(() => {
    return mocks.filter((m) => {
      if (activeType !== "all" && (m.category ?? "full_length") !== activeType) return false;
      if (q && !m.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [mocks, activeType, q]);

  const toggle = (id: string) => {
    if (selectedTestIds.includes(id)) onTestIdsChange(selectedTestIds.filter((x) => x !== id));
    else onTestIdsChange([...selectedTestIds, id]);
  };

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedTestIds.includes(m.id));
  const toggleAll = () => {
    if (allSelected) {
      onTestIdsChange(selectedTestIds.filter((id) => !filtered.some((m) => m.id === id)));
    } else {
      const merged = new Set([...selectedTestIds, ...filtered.map((m) => m.id)]);
      onTestIdsChange([...merged]);
    }
  };

  if (selectedCategories.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Select at least one mock category in the field above to start picking mocks.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto">
          {selectedCategories.map((c) => (
            <TabsTrigger key={c} value={c} className="text-xs">{c}</TabsTrigger>
          ))}
        </TabsList>
        {selectedCategories.map((c) => (
          <TabsContent key={c} value={c} className="space-y-3 mt-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Tabs value={activeType} onValueChange={setActiveType} className="flex-1">
                <TabsList className="flex-wrap h-auto">
                  {TYPE_TABS.map((t) => (
                    <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mock..." className="pl-8 h-9" />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : (
              <Card className="overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr className="text-left text-xs">
                        <th className="px-3 py-2 w-10">
                          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                        </th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium w-28">Type</th>
                        <th className="px-3 py-2 font-medium w-20">Duration</th>
                        <th className="px-3 py-2 font-medium w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 && (
                        <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground text-xs">No mocks match.</td></tr>
                      )}
                      {filtered.map((m) => {
                        const checked = selectedTestIds.includes(m.id);
                        return (
                          <tr key={m.id} className={`border-t hover:bg-muted/30 ${checked ? "bg-sky-50/40" : ""}`}>
                            <td className="px-3 py-2"><Checkbox checked={checked} onCheckedChange={() => toggle(m.id)} /></td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{m.name}</div>
                              <div className="text-[10px] text-muted-foreground">/{m.slug}</div>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-[10px]">{m.category ?? "full_length"}</Badge>
                            </td>
                            <td className="px-3 py-2 text-xs">{m.total_duration_minutes ?? "—"} min</td>
                            <td className="px-3 py-2">
                              {m.is_live ? <Badge className="text-[10px] bg-emerald-600">Live</Badge> : <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
      <div className="text-xs text-muted-foreground">
        <strong>{selectedTestIds.length}</strong> mock{selectedTestIds.length === 1 ? "" : "s"} selected across all categories.
      </div>
    </div>
  );
}
