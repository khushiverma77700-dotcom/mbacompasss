import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trophy, Crown, Medal, Flame, Coins, Zap } from "lucide-react";

interface Row {
  rank: number; user_id: string; display_handle: string;
  coins: number; xp: number; level: number; streak_days: number;
  total_mocks_completed: number; is_self: boolean;
}
interface Settings { is_public: boolean; display_handle: string | null; target_percentile: number | null; }

export default function StudentLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [settings, setSettings] = useState<Settings>({ is_public: false, display_handle: "", target_percentile: null });
  const [tab, setTab] = useState<"global" | "peer">("global");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: lb }, { data: s }] = await Promise.all([
      supabase.rpc("get_global_leaderboard", { _limit: 100 }),
      supabase.from("student_leaderboard_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setRows((lb ?? []) as any);
    if (s) setSettings({ is_public: s.is_public, display_handle: s.display_handle ?? "", target_percentile: s.target_percentile });
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const saveSettings = async () => {
    if (!user) return;
    const { error } = await supabase.from("student_leaderboard_settings").upsert({
      user_id: user.id,
      is_public: settings.is_public,
      display_handle: settings.display_handle || null,
      target_percentile: settings.target_percentile,
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Leaderboard settings saved");
    load();
  };

  const peerRows = rows.filter(r => settings.target_percentile && Math.abs((r.level ?? 0) - 5) < 99); // simple peer band placeholder
  const view = tab === "global" ? rows : peerRows;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Trophy className="h-6 w-6 text-amber-500" /> Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">See where you stand among other aspirants.</p>
        </div>
      </div>

      <Card className="p-5 border-sky-100 bg-gradient-to-br from-sky-50/60 to-white">
        <div className="font-semibold mb-3">Your visibility</div>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Display handle</label>
            <Input value={settings.display_handle ?? ""} onChange={e => setSettings({ ...settings, display_handle: e.target.value })} placeholder="e.g. CAT_Crusher_24" maxLength={32} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Target percentile</label>
            <Input type="number" min={50} max={100} value={settings.target_percentile ?? ""} onChange={e => setSettings({ ...settings, target_percentile: e.target.value ? Number(e.target.value) : null })} placeholder="e.g. 99" />
          </div>
          <div className="flex items-center justify-between gap-3 sm:col-span-1">
            <div>
              <div className="text-sm font-medium">Show on public board</div>
              <div className="text-xs text-muted-foreground">Off = peer-only mode</div>
            </div>
            <Switch checked={settings.is_public} onCheckedChange={v => setSettings({ ...settings, is_public: v })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveSettings} className="bg-sky-600 hover:bg-sky-700">Save</Button>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={v => setTab(v as any)}>
        <TabsList className="bg-sky-50">
          <TabsTrigger value="global">Public ({rows.length})</TabsTrigger>
          <TabsTrigger value="peer">My peer band</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : view.length === 0 ? (
            <Card className="p-8 text-center border-sky-100">
              <Trophy className="h-10 w-10 mx-auto text-sky-300 mb-3" />
              <div className="font-medium">No public ranks yet</div>
              <div className="text-sm text-muted-foreground mt-1">Be the first — turn on "Show on public board" above.</div>
            </Card>
          ) : (
            <Card className="border-sky-100 overflow-hidden">
              <div className="divide-y divide-sky-50">
                {view.map(r => (
                  <div key={r.user_id} className={`flex items-center gap-3 px-4 py-3 ${r.is_self ? "bg-sky-50/70" : "hover:bg-sky-50/30"}`}>
                    <div className="w-10 text-center">
                      {r.rank === 1 ? <Crown className="h-5 w-5 text-amber-500 mx-auto" /> :
                       r.rank === 2 ? <Medal className="h-5 w-5 text-gray-400 mx-auto" /> :
                       r.rank === 3 ? <Medal className="h-5 w-5 text-orange-500 mx-auto" /> :
                       <span className="text-sm font-semibold text-gray-600">#{r.rank}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate flex items-center gap-2">
                        {r.display_handle}
                        {r.is_self && <span className="text-[10px] bg-sky-600 text-white px-1.5 py-0.5 rounded">You</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">Level {r.level} • {r.total_mocks_completed} mocks</div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-sky-700"><Zap className="h-3 w-3" />{r.xp}</span>
                      <span className="flex items-center gap-1 text-amber-700"><Coins className="h-3 w-3" />{r.coins}</span>
                      <span className="flex items-center gap-1 text-orange-700"><Flame className="h-3 w-3" />{r.streak_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
