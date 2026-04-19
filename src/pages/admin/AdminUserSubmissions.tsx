import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle, Eye, Building2, GraduationCap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUS_TABS = [
  { id: "pending", label: "Pending Review" },
  { id: "changes_requested", label: "Changes Requested" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "draft", label: "Drafts" },
];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800",
  changes_requested: "bg-orange-100 text-orange-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const AdminUserSubmissions = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ kind: "approve" | "reject" | "changes"; item: any } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_listings")
      .select("*")
      .order("updated_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) => i.status === activeTab);

  const counts: Record<string, number> = {};
  STATUS_TABS.forEach((t) => { counts[t.id] = items.filter((i) => i.status === t.id).length; });

  const runAction = async (kind: "approve" | "reject" | "changes", item: any) => {
    setSubmitting(true);
    try {
      const action = kind === "approve" ? "approve" : kind === "reject" ? "reject" : "request_changes";
      const { data, error } = await supabase.functions.invoke("approve-user-listing", {
        body: { listing_id: item.id, action, admin_notes: adminNotes || null },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success(
        kind === "approve" ? "Listing approved & published" : kind === "reject" ? "Listing rejected" : "Changes requested",
      );
      setActionDialog(null);
      setAdminNotes("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Submissions</h1>
        <p className="text-sm text-muted-foreground">Review listings submitted by coaching institutes & colleges.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-2">
              {t.label}
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted">{counts[t.id] || 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">No listings in this status.</Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((l) => {
                  const Icon = l.listing_type === "college" ? GraduationCap : Building2;
                  const orgName = (l.poc as any)?.organization || (l.payload as any)?.name || "Untitled";
                  const pocName = (l.poc as any)?.full_name;
                  const pocPhone = (l.poc as any)?.phone;
                  return (
                    <Card key={l.id} className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold">{orgName}</div>
                            <div className="text-xs text-muted-foreground capitalize mt-0.5">
                              {l.listing_type} • {pocName || "—"} {pocPhone && `• ${pocPhone}`}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Updated {new Date(l.updated_at).toLocaleString()}
                            </div>
                            {l.admin_notes && (
                              <div className="text-xs mt-2 p-2 rounded bg-muted/50">
                                <span className="font-medium">Note:</span> {l.admin_notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={STATUS_STYLES[l.status]}>{l.status.replace("_", " ")}</Badge>
                          <Button size="sm" variant="outline" onClick={() => setReviewItem(l)}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> Review
                          </Button>
                          {l.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => { setAdminNotes(""); setActionDialog({ kind: "changes", item: l }); }}>
                                <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Request Changes
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => { setAdminNotes(""); setActionDialog({ kind: "reject", item: l }); }}>
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                              </Button>
                              <Button size="sm" onClick={() => { setAdminNotes(""); setActionDialog({ kind: "approve", item: l }); }}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Approve
                              </Button>
                            </>
                          )}
                          {l.status === "approved" && l.approved_record_id && (
                            <Button size="sm" variant="outline" asChild>
                              <a
                                href={`/${l.listing_type === "college" ? "college" : "institute"}/${(l.payload as any)?.slug || ""}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Live
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Review payload dialog */}
      <Dialog open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {reviewItem && <SubmissionDetails item={reviewItem} />}
        </DialogContent>
      </Dialog>

      {/* Action dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.kind === "approve" && "Approve & publish listing"}
              {actionDialog?.kind === "reject" && "Reject listing"}
              {actionDialog?.kind === "changes" && "Request changes from submitter"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionDialog?.kind === "approve" && (
              <p className="text-sm text-muted-foreground">
                This will create a live record in the {actionDialog.item.listing_type === "college" ? "colleges" : "institutes"} table and publish it to the site.
              </p>
            )}
            <div>
              <Label className="text-xs">Admin notes {actionDialog?.kind !== "approve" && "(visible to user)"}</Label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={4} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={submitting}>Cancel</Button>
            <Button
              variant={actionDialog?.kind === "reject" ? "destructive" : "default"}
              disabled={submitting}
              onClick={() => actionDialog && runAction(actionDialog.kind, actionDialog.item)}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserSubmissions;
