import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Clock, CheckCircle, Send, Moon, Radio } from "lucide-react";

interface RunStatus {
  in_window: boolean;
  is_active: boolean;
  window_start_utc: string;
  window_end_utc: string;
  next_window_start_utc: string;
  submitted_in_window: number;
  indexed_in_window: number;
  failed_in_window: number;
  auto_run_ticks: number;
  last_activity_at: string | null;
}

const formatCountdown = (target: Date) => {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "now";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const NightlyAutoRunPanel = () => {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [, setTick] = useState(0);

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-indexing", {
        body: { action: "current_run_status" },
      });
      if (!error && data && (data as any).ok) {
        setStatus((data as any).data);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll faster when active
  useEffect(() => {
    const interval = window.setInterval(
      fetchStatus,
      status?.is_active || status?.in_window ? 5000 : 30000
    );
    return () => window.clearInterval(interval);
  }, [fetchStatus, status?.is_active, status?.in_window]);

  // Tick local timer every second for countdown UI
  useEffect(() => {
    const t = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  if (!status) {
    return (
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/60 to-sky-50/60">
        <CardContent className="p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 animate-pulse" /> Loading nightly auto-run status…
        </CardContent>
      </Card>
    );
  }

  const isActive = status.is_active;
  const inWindow = status.in_window;
  const windowStart = new Date(status.window_start_utc);
  const windowEnd = new Date(status.window_end_utc);
  const nextStart = new Date(status.next_window_start_utc);

  // Progress through the 1-hour window
  const totalMs = windowEnd.getTime() - windowStart.getTime();
  const elapsedMs = Math.max(0, Math.min(totalMs, Date.now() - windowStart.getTime()));
  const windowProgress = Math.round((elapsedMs / totalMs) * 100);

  return (
    <Card
      className={`relative overflow-hidden border-2 transition-colors ${
        isActive
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 via-sky-50 to-blue-50"
          : inWindow
            ? "border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50"
            : "border-blue-100 bg-gradient-to-r from-blue-50/60 to-sky-50/60"
      }`}
    >
      {/* Animated sweep stripe when active */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-200 to-transparent"
            style={{
              animation: "sweep 2.5s linear infinite",
            }}
          />
          <style>{`@keyframes sweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
        </div>
      )}

      <CardContent className="relative p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`relative flex items-center justify-center w-11 h-11 rounded-full ${
                isActive ? "bg-emerald-100" : "bg-blue-100"
              }`}
            >
              {isActive ? (
                <>
                  <Radio className="w-5 h-5 text-emerald-600 relative z-10" />
                  <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                </>
              ) : (
                <Moon className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-foreground">
                  Nightly Auto-Indexing
                </h3>
                {isActive ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </Badge>
                ) : inWindow ? (
                  <Badge variant="outline" className="border-sky-300 text-sky-700 bg-white">
                    In window
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white">
                    Idle
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Runs automatically every day from{" "}
                <span className="font-medium text-foreground">12:00 AM → 1:00 AM IST</span>.
                Discovers new URLs, submits them to Google, and checks index status.
              </p>
            </div>
          </div>

          <div className="text-left lg:text-right text-sm">
            {isActive || inWindow ? (
              <>
                <div className="text-xs text-muted-foreground">Window ends in</div>
                <div className="text-lg font-bold text-emerald-700 font-mono">
                  {formatCountdown(windowEnd)}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">Next run starts in</div>
                <div className="text-lg font-bold text-blue-700 font-mono">
                  {formatCountdown(nextStart)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Window progress bar */}
        {(isActive || inWindow) && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Window progress</span>
              <span>{windowProgress}%</span>
            </div>
            <Progress value={windowProgress} className="h-2" />
          </div>
        )}

        {/* Live stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatCell
            icon={<Activity className="w-4 h-4 text-blue-600" />}
            label="Heartbeats"
            value={status.auto_run_ticks}
            highlight={isActive}
          />
          <StatCell
            icon={<Send className="w-4 h-4 text-sky-600" />}
            label="Submitted tonight"
            value={status.submitted_in_window}
            highlight={isActive}
          />
          <StatCell
            icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
            label="Indexed tonight"
            value={status.indexed_in_window}
            highlight={isActive}
          />
          <StatCell
            icon={<Clock className="w-4 h-4 text-amber-600" />}
            label="Last activity"
            value={
              status.last_activity_at
                ? new Date(status.last_activity_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  highlight?: boolean;
}

const StatCell = ({ icon, label, value, highlight }: StatCellProps) => (
  <div
    className={`rounded-lg border bg-white/80 backdrop-blur-sm p-3 transition-shadow ${
      highlight ? "border-emerald-200 shadow-sm" : "border-blue-100"
    }`}
  >
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <div className="text-xl font-bold text-foreground mt-1">{value}</div>
  </div>
);

export default NightlyAutoRunPanel;
