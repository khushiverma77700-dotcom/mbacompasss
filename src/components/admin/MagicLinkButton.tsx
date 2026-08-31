import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Link2, Loader2, Trash2 } from "lucide-react";

export type MagicEntityType = "college" | "article" | "exam";

interface Props {
  entityType: MagicEntityType;
  entityId: string;
  entityTitle?: string | null;
  entitySlug?: string | null;
  /** Compact icon-only trigger for table rows. */
  compact?: boolean;
}

interface MagicLink {
  id: string;
  token: string;
  active: boolean;
  note: string | null;
  opened_count: number;
  saved_count: number;
  last_opened_at: string | null;
  last_saved_at: string | null;
}

const MagicLinkButton = ({ entityType, entityId, entityTitle, entitySlug, compact }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<MagicLink | null>(null);
  const [note, setNote] = useState("");
  const { toast } = useToast();

  const shareUrl = link ? `${window.location.origin}/edit/${link.token}` : "";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_magic_links")
      .select("id, token, active, note, opened_count, saved_count, last_opened_at, last_saved_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();
    setLoading(false);
    if (error) {
      toast({ title: "Could not load edit link", description: error.message, variant: "destructive" });
      return;
    }
    setLink(data as MagicLink | null);
    setNote((data as MagicLink | null)?.note || "");
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createLink = async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("content_magic_links")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        entity_title: entityTitle || null,
        entity_slug: entitySlug || null,
        note: note || null,
        created_by: userRes?.user?.id || null,
        active: true,
      })
      .select("id, token, active, note, opened_count, saved_count, last_opened_at, last_saved_at")
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Could not create link", description: error.message, variant: "destructive" });
      return;
    }
    setLink(data as MagicLink);
    toast({ title: "Magic edit link created" });
  };

  const toggleActive = async (next: boolean) => {
    if (!link) return;
    const { error } = await supabase.from("content_magic_links").update({ active: next }).eq("id", link.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setLink({ ...link, active: next });
    toast({
      title: next ? "Link is now active" : "Link switched off",
      description: next ? "Anyone with the link can edit this page." : "The shared link no longer works.",
    });
  };

  const saveNote = async () => {
    if (!link) return;
    const { error } = await supabase.from("content_magic_links").update({ note: note || null }).eq("id", link.id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else toast({ title: "Note saved" });
  };

  const deleteLink = async () => {
    if (!link) return;
    const { error } = await supabase.from("content_magic_links").delete().eq("id", link.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setLink(null);
    toast({ title: "Link revoked" });
  };

  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Magic link copied", description: shareUrl });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="icon" title="Magic edit link">
            <Link2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Link2 className="w-4 h-4 mr-2" /> Magic Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Magic edit link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with anyone. They get the same page content in an editor — they can update content, meta
            tags and run AI SEO. Switch it off any time and the link stops working instantly.
          </p>
          {entityTitle && <p className="text-sm font-medium">{entityTitle}</p>}

          {loading && !link ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : link ? (
            <>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Link status</p>
                  <p className="text-sm text-muted-foreground">
                    {link.active ? "Active — editable by anyone with the link" : "Inactive — link is blocked"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={link.active ? "default" : "secondary"}>{link.active ? "ON" : "OFF"}</Badge>
                  <Switch checked={link.active} onCheckedChange={toggleActive} />
                </div>
              </div>

              <div className="flex gap-2">
                <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
                <Button onClick={copy} disabled={!link.active && false}>
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
              </div>

              <div className="flex gap-2">
                <Input placeholder="Note (who is this shared with?)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button variant="outline" onClick={saveNote}>Save</Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="rounded-md border p-2">
                  Opened <span className="font-semibold text-foreground">{link.opened_count}</span> times
                  {link.last_opened_at && <div className="text-xs">Last: {new Date(link.last_opened_at).toLocaleString()}</div>}
                </div>
                <div className="rounded-md border p-2">
                  Saved <span className="font-semibold text-foreground">{link.saved_count}</span> times
                  {link.last_saved_at && <div className="text-xs">Last: {new Date(link.last_saved_at).toLocaleString()}</div>}
                </div>
              </div>

              <Button variant="ghost" className="text-destructive" onClick={deleteLink}>
                <Trash2 className="w-4 h-4 mr-2" /> Revoke link permanently
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Input placeholder="Note (optional) — who is this shared with?" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button onClick={createLink} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
                Generate magic link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MagicLinkButton;
