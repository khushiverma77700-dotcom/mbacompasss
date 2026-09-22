// Admin overview of every WhatsApp campaign: live progress, edit and delete.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";

type CampaignRow = {
  id: string;
  name: string;
  message_type: "template" | "text";
  template_name: string | null;
  daily_limit: number;
  start_date: string;
  total_target: number | null;
  status: string;
  send_start_time: string;
  send_end_time: string;
  send_timezone: string;
  last_run_at: string | null;
};

type ProgressRow = {
  campaign_id: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  retry: number;
};

const TIME_ZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
];

const shortTime = (value: string | null | undefined) => (value ?? "").slice(0, 5);

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  running: "default",
  paused: "secondary",
  draft: "outline",
  completed: "secondary",
  stopped: "destructive",
};

type Props = {
  onSelect: (campaignId: string) => void;
  onChanged: () => void;
};

export default function WhatsAppCampaignOverview({ onSelect, onChanged }: Props) {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);

  const load = useCallback(async () => {
    const [campaignRes, progressRes] = await Promise.all([
      supabase
        .from("whatsapp_campaigns")
        .select(
          "id, name, message_type, template_name, daily_limit, start_date, total_target, status, send_start_time, send_end_time, send_timezone, last_run_at",
        )
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.rpc("whatsapp_campaign_progress"),
    ]);
    setLoading(false);
    if (campaignRes.error) {
      toast.error(campaignRes.error.message);
      return;
    }
    setRows((campaignRes.data ?? []) as CampaignRow[]);
    if (!progressRes.error) setProgress((progressRes.data ?? []) as ProgressRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const progressById = useMemo(() => {
    const map = new Map<string, ProgressRow>();
    for (const p of progress) map.set(p.campaign_id, p);
    return map;
  }, [progress]);

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Give the campaign a name");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("whatsapp_campaigns")
      .update({
        name: editing.name.trim(),
        daily_limit: Math.max(editing.daily_limit || 1, 1),
        start_date: editing.start_date,
        total_target: editing.total_target && editing.total_target > 0 ? editing.total_target : null,
        send_start_time: shortTime(editing.send_start_time) || "09:00",
        send_end_time: shortTime(editing.send_end_time) || "21:00",
        send_timezone: editing.send_timezone || "Asia/Kolkata",
        status: editing.status,
      })
      .eq("id", editing.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign updated");
    setEditing(null);
    await load();
    onChanged();
  };

  const remove = async (row: CampaignRow) => {
    const { error } = await supabase.from("whatsapp_campaigns").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign deleted");
    await load();
    onChanged();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">All campaigns</h2>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Per day</TableHead>
                <TableHead>Window</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const p = progressById.get(row.id);
                const total = p?.total ?? 0;
                const done = (p?.sent ?? 0) + (p?.failed ?? 0);
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <button
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => onSelect(row.id)}
                      >
                        {row.name}
                      </button>
                      <span className="block text-sm text-muted-foreground">
                        {row.message_type === "template" ? row.template_name : "Plain text"} · from{" "}
                        {row.start_date}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status] ?? "outline"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <Progress value={pct} className="h-2" />
                      <span className="text-sm text-muted-foreground">
                        {done}/{total} ({pct}%)
                      </span>
                    </TableCell>
                    <TableCell>{p?.sent ?? 0}</TableCell>
                    <TableCell>{p?.failed ?? 0}</TableCell>
                    <TableCell>{(p?.pending ?? 0) + (p?.retry ?? 0)}</TableCell>
                    <TableCell>{row.daily_limit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shortTime(row.send_start_time)}–{shortTime(row.send_end_time)}
                      <span className="block">{row.send_timezone}</span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setEditing({ ...row })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void remove(row)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => (open ? null : setEditing(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Daily limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.daily_limit}
                  onChange={(e) =>
                    setEditing({ ...editing, daily_limit: parseInt(e.target.value, 10) || 1 })
                  }
                />
              </div>
              <div>
                <Label>Total numbers to process</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.total_target ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, total_target: parseInt(e.target.value, 10) || null })
                  }
                />
              </div>
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={editing.start_date}
                  onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editing.status}
                  onValueChange={(v) => setEditing({ ...editing, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["draft", "running", "paused", "completed", "stopped"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Send from</Label>
                <Input
                  type="time"
                  value={shortTime(editing.send_start_time)}
                  onChange={(e) => setEditing({ ...editing, send_start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Send until</Label>
                <Input
                  type="time"
                  value={shortTime(editing.send_end_time)}
                  onChange={(e) => setEditing({ ...editing, send_end_time: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Time zone</Label>
                <Select
                  value={editing.send_timezone}
                  onValueChange={(v) => setEditing({ ...editing, send_timezone: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_ZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
