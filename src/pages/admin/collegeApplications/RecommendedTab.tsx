import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Save, Star, StarOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TrackerRow } from "@/lib/applicationTracker";

type Draft = {
  recommendation_label: string;
  recommendation_note: string;
  recommendation_priority: number;
};

type Props = { trackers: TrackerRow[] };

type RecommendationPatch = {
  is_recommended?: boolean;
  recommendation_label?: string | null;
  recommendation_note?: string | null;
  recommendation_priority?: number;
};

export default function RecommendedTab({ trackers }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const recommended = useMemo(
    () =>
      trackers
        .filter((r) => r.is_recommended)
        .sort(
          (a, b) =>
            (a.recommendation_priority ?? 0) - (b.recommendation_priority ?? 0) ||
            a.name.localeCompare(b.name),
        ),
    [trackers],
  );

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return trackers
      .filter((r) => !r.is_recommended && r.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [trackers, search]);

  const draftFor = (row: TrackerRow): Draft =>
    drafts[row.id] ?? {
      recommendation_label: row.recommendation_label ?? "",
      recommendation_note: row.recommendation_note ?? "",
      recommendation_priority: row.recommendation_priority ?? 0,
    };

  const setDraft = (row: TrackerRow, next: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [row.id]: { ...draftFor(row), ...next } }));

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RecommendationPatch }) => {
      const { error } = await supabase.from("application_trackers").update(patch).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-application-trackers"] });
      queryClient.invalidateQueries({ queryKey: ["application-trackers"] });
      toast({ title: "Recommendation updated" });
    },
    onError: (e: unknown) =>
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = recommended[index + direction];
    const row = recommended[index];
    if (!row || !target) return;
    update.mutate({ id: row.id, patch: { recommendation_priority: index + direction + 1 } });
    update.mutate({ id: target.id, patch: { recommendation_priority: index + 1 } });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Add a recommendation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search a college or exam to recommend"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <div className="flex flex-wrap gap-2">
            {candidates.map((row) => (
              <Button
                key={row.id}
                size="sm"
                variant="outline"
                onClick={() =>
                  update.mutate({
                    id: row.id,
                    patch: {
                      is_recommended: true,
                      recommendation_priority: recommended.length + 1,
                    },
                  })
                }
              >
                <Star className="mr-1 h-3.5 w-3.5" />
                {row.name}
              </Button>
            ))}
            {search.trim() && candidates.length === 0 && (
              <p className="text-muted-foreground">No matches outside the recommended list.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recommended applications ({recommended.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Order</TableHead>
                <TableHead className="min-w-[180px]">College / exam</TableHead>
                <TableHead className="min-w-[180px]">Badge label</TableHead>
                <TableHead className="min-w-[240px]">Why we recommend it</TableHead>
                <TableHead className="w-[140px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recommended.map((row, index) => {
                const draft = draftFor(row);
                const dirty = !!drafts[row.id];
                return (
                  <TableRow key={row.id}>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{index + 1}</span>
                        <div className="flex flex-col">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={index === recommended.length - 1}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="font-medium">{row.name}</div>
                      <Badge variant="secondary" className="mt-1">
                        {row.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        placeholder="e.g. Closing soon"
                        value={draft.recommendation_label}
                        onChange={(e) => setDraft(row, { recommendation_label: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        rows={4}
                        placeholder="One or two lines students will read"
                        value={draft.recommendation_note}
                        onChange={(e) => setDraft(row, { recommendation_note: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          disabled={!dirty || update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: row.id,
                              patch: {
                                recommendation_label: draft.recommendation_label.trim() || null,
                                recommendation_note: draft.recommendation_note.trim() || null,
                              },
                            })
                          }
                        >
                          {update.isPending ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            update.mutate({
                              id: row.id,
                              patch: { is_recommended: false, recommendation_priority: 0 },
                            })
                          }
                        >
                          <StarOff className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {recommended.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nothing recommended yet. Search above to add the first one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
