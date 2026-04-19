import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Eye, ExternalLink, Building2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatFieldName } from "@/lib/listingDiff";

const STATUS_TABS = [
  { id: "pending", label: "Pending Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const formatValue = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ");
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
};

const AdminListingChangeRequests = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ kind: "approve" | "reject"; item: any } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("listing_change_requests")
      .select("*")
      .order("submitted_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => i.status === tab);

  const performAction = async () => {
    if (!actionDialog) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("apply-listing-change", {
        body: {
          change_request_id: actionDialog.item.id,
          action: actionDialog.kind,
          admin_notes: adminNotes || null,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error(error?.message || (data as any)?.error || "Action failed");
      }
      toast.success(actionDialog.kind === "approve" ? "Changes applied to live listing" : "Change request rejected");
      setActionDialog(null);
      setReviewItem(null);
      setAdminNotes("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const counts = {
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Listing Change Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and apply edits proposed by listing owners.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {STATUS_TABS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="gap-2">
              {t.label}
              <Badge variant="secondary" className="text-xs">{counts[t.id as keyof typeof counts] ?? 0}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No {tab} change requests.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const fieldCount = Object.keys(item.diff || {}).length;
            const Icon = item.listing_type === "college" ? GraduationCap : Building2;
            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">
                          {item.new_payload?.name || item.old_payload?.name || "Unnamed"}
                        </p>
                        <Badge className={STATUS_STYLES[item.status]}>{item.status}</Badge>
                        <Badge variant="outline" className="capitalize">{item.listing_type}</Badge>
                        <Badge variant="secondary">{fieldCount} field{fieldCount !== 1 ? "s" : ""} changed</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(item.submitted_at).toLocaleString()}
                        {item.reviewed_at && ` · Reviewed ${new Date(item.reviewed_at).toLocaleString()}`}
                      </p>
                      {item.admin_notes && (
                        <p className="text-xs italic text-muted-foreground mt-1">Note: {item.admin_notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReviewItem(item)}>
                      <Eye className="w-4 h-4 mr-1.5" /> Review
                    </Button>
                    {item.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => { setActionDialog({ kind: "approve", item }); setAdminNotes(""); }}>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => { setActionDialog({ kind: "reject", item }); setAdminNotes(""); }}>
                          <XCircle className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Diff Review Dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              Field-by-field changes
              {reviewItem && (
                <Link
                  to={`/${reviewItem.target_table === "colleges" ? "college" : "institute"}/${reviewItem.new_payload?.slug || reviewItem.old_payload?.slug || ""}`}
                  target="_blank"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1 font-normal"
                >
                  View live <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </DialogTitle>
          </DialogHeader>
          {reviewItem && (
            <ScrollArea className="max-h-[60vh] pr-4">
              {Object.keys(reviewItem.diff || {}).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No field-level differences detected.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(reviewItem.diff as Record<string, { old: unknown; new: unknown }>).map(([key, change]) => (
                    <div key={key} className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-3 py-1.5 text-sm font-medium text-foreground">
                        {formatFieldName(key)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                        <div className="p-3 bg-red-50/50">
                          <p className="text-xs uppercase font-semibold text-red-700 mb-1">Current (live)</p>
                          <pre className="text-xs whitespace-pre-wrap break-words text-foreground/80 font-sans">{formatValue(change.old)}</pre>
                        </div>
                        <div className="p-3 bg-green-50/50">
                          <p className="text-xs uppercase font-semibold text-green-700 mb-1">Proposed</p>
                          <pre className="text-xs whitespace-pre-wrap break-words text-foreground/80 font-sans">{formatValue(change.new)}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            {reviewItem?.status === "pending" && (
              <>
                <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => { setActionDialog({ kind: "reject", item: reviewItem }); setAdminNotes(""); }}>
                  <XCircle className="w-4 h-4 mr-1.5" /> Reject
                </Button>
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setActionDialog({ kind: "approve", item: reviewItem }); setAdminNotes(""); }}>
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve & apply
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action confirmation */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionDialog?.kind === "approve" ? "Approve and apply changes" : "Reject change request"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {actionDialog?.kind === "approve"
                ? "The proposed values will overwrite the live listing immediately. SEO fields (meta, keywords, ranking, tier) are preserved."
                : "The owner will see this rejection in their dashboard."}
            </p>
            <div>
              <Label htmlFor="notes">Admin notes (optional)</Label>
              <Textarea id="notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Visible to the listing owner" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              onClick={performAction}
              disabled={submitting}
              className={actionDialog?.kind === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              variant={actionDialog?.kind === "reject" ? "destructive" : "default"}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {actionDialog?.kind === "approve" ? "Approve & apply" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminListingChangeRequests;
