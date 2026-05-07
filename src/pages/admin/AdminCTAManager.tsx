import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ShieldCheck, Lock, Unlock, BarChart3, MousePointerClick, LogIn, Zap } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cta = {
  id: string;
  cta_key: string;
  label: string;
  category: string;
  description: string | null;
  location_hint: string | null;
  requires_login: boolean;
};

const AdminCTAManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Cta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("cta_settings")
        .select("*")
        .order("category", { ascending: true })
        .order("label", { ascending: true });
      if (cancelled) return;
      if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      setRows((data as any) || []);
      setLoading(false);
    };
    load();

    // Realtime keeps the page in sync with other admins
    const channel = supabase
      .channel("admin_cta_settings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cta_settings" },
        (payload: any) => {
          setRows((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((r) => r.id !== payload.old.id);
            }
            const next = payload.new as Cta;
            const i = prev.findIndex((r) => r.id === next.id);
            if (i === -1) return [...prev, next].sort((a, b) => (a.category + a.label).localeCompare(b.category + b.label));
            const copy = prev.slice();
            copy[i] = next;
            return copy;
          });
        }
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [toast]);

  const toggle = async (row: Cta, value: boolean) => {
    setSavingKey(row.cta_key);
    // Optimistic update
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, requires_login: value } : r)));
    const { error } = await supabase
      .from("cta_settings")
      .update({ requires_login: value })
      .eq("id", row.id);
    setSavingKey(null);
    if (error) {
      // revert
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, requires_login: !value } : r)));
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: value ? "Login required enabled" : "Login requirement removed",
      description: row.label,
    });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.label.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        (r.description || "").toLowerCase().includes(term) ||
        (r.location_hint || "").toLowerCase().includes(term) ||
        r.cta_key.toLowerCase().includes(term)
    );
  }, [rows, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, Cta[]>();
    filtered.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const totalGated = rows.filter((r) => r.requires_login).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            CTA Login Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Toggle login requirement for any button on the site. Changes apply instantly across all visitors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {totalGated} of {rows.length} gated
          </Badge>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search CTA, category, location…"
              className="pl-8 w-64"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading CTA settings…
        </div>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No CTAs match your search.</CardContent></Card>
      ) : (
        grouped.map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{cat}</CardTitle>
              <CardDescription>
                {items.filter((i) => i.requires_login).length} of {items.length} require login
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {items.map((row) => (
                <div key={row.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{row.label}</span>
                      {row.requires_login ? (
                        <Badge variant="default" className="text-[10px] gap-1">
                          <Lock className="w-3 h-3" /> Login required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Unlock className="w-3 h-3" /> Public
                        </Badge>
                      )}
                    </div>
                    {row.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{row.description}</p>
                    )}
                    {row.location_hint && (
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        <span className="font-medium">Where:</span> {row.location_hint}
                      </p>
                    )}
                    <code className="text-[10px] text-muted-foreground/70">{row.cta_key}</code>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {savingKey === row.cta_key && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={row.requires_login}
                      onCheckedChange={(v) => toggle(row, v)}
                      aria-label={`Toggle login required for ${row.label}`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminCTAManager;
