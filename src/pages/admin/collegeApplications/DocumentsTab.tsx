import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Save, Trash2, FileText } from "lucide-react";
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
import FileUpload from "@/components/admin/FileUpload";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { TrackerRow } from "@/lib/applicationTracker";

type Draft = { inside_info_url: string; inside_info_notes: string };

type Props = { trackers: TrackerRow[] };

export default function DocumentsTab({ trackers }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return trackers.filter((row) => {
      if (term && !row.name.toLowerCase().includes(term)) return false;
      if (onlyMissing && row.inside_info_url) return false;
      return true;
    });
  }, [trackers, search, onlyMissing]);

  const withDocs = trackers.filter((r) => !!r.inside_info_url).length;

  const draftFor = (row: TrackerRow): Draft =>
    drafts[row.id] ?? {
      inside_info_url: row.inside_info_url ?? "",
      inside_info_notes: row.inside_info_notes ?? "",
    };

  const setDraft = (row: TrackerRow, next: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [row.id]: { ...draftFor(row), ...next } }));

  const save = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: Draft }) => {
      const { error } = await supabase
        .from("application_trackers")
        .update({
          inside_info_url: draft.inside_info_url.trim() || null,
          inside_info_notes: draft.inside_info_notes.trim() || null,
        })
        .eq("id", id);
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
      toast({ title: "Inside information saved" });
    },
    onError: (e: unknown) =>
      toast({
        title: "Could not save",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground">Records</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold">{trackers.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground">With a document</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold">{withDocs}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground">Still missing</CardTitle>
          </CardHeader>
          <CardContent className="font-semibold">{trackers.length - withDocs}</CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          variant={onlyMissing ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyMissing((v) => !v)}
        >
          Missing documents only
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">College / exam</TableHead>
                <TableHead className="min-w-[280px]">Inside information document</TableHead>
                <TableHead className="min-w-[240px]">Notes shown to students</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const draft = draftFor(row);
                const dirty = !!drafts[row.id];
                return (
                  <TableRow key={row.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{row.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="secondary">{row.category}</Badge>
                        {row.inside_info_url ? (
                          <Badge className="gap-1">
                            <FileText className="h-3 w-3" /> Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="outline">No document</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <FileUpload
                        bucket="uploads"
                        folder="application-inside-info"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                        label="Upload or paste a link"
                        value={draft.inside_info_url}
                        onChange={(url) => setDraft(row, { inside_info_url: url })}
                      />
                      {draft.inside_info_url && (
                        <a
                          href={draft.inside_info_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Open document <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        rows={5}
                        placeholder="What students will read alongside the document"
                        value={draft.inside_info_notes}
                        onChange={(e) => setDraft(row, { inside_info_notes: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          disabled={!dirty || save.isPending}
                          onClick={() => save.mutate({ id: row.id, draft })}
                        >
                          {save.isPending && save.variables?.id === row.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="mr-1 h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                        {row.inside_info_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              save.mutate({
                                id: row.id,
                                draft: { inside_info_url: "", inside_info_notes: draft.inside_info_notes },
                              })
                            }
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No records match this search.
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
