import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, CheckCircle, Database, Globe, HardDrive, Layers, Zap } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CacheTarget {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  action: () => Promise<{ cleared: boolean; detail?: string }>;
}

const AdminClearCache = () => {
  const [clearing, setClearing] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [cleared, setCleared] = useState<Record<string, { success: boolean; detail?: string }>>({});
  const queryClient = useQueryClient();

  const cacheTargets: CacheTarget[] = [
    {
      key: "reactQuery",
      label: "App Data Cache (React Query)",
      description: "All fetched data — institutes, colleges, articles, settings, leads, etc. This is the most impactful cache to clear.",
      icon: Database,
      action: async () => {
        const queryCount = queryClient.getQueryCache().getAll().length;
        queryClient.clear();
        return { cleared: true, detail: `${queryCount} cached queries removed` };
      },
    },
    {
      key: "localStorage",
      label: "Local Storage",
      description: "Saved preferences, theme settings, and cached UI state. Auth session is preserved.",
      icon: HardDrive,
      action: async () => {
        const authKeys: { k: string; v: string | null }[] = [];
        let removedCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("sb-") || key === "supabase.auth.token")) {
            authKeys.push({ k: key, v: localStorage.getItem(key) });
          }
        }
        removedCount = localStorage.length - authKeys.length;
        localStorage.clear();
        authKeys.forEach(({ k, v }) => { if (v) localStorage.setItem(k, v); });
        return { cleared: true, detail: `${removedCount} items cleared, auth preserved` };
      },
    },
    {
      key: "sessionStorage",
      label: "Session Storage",
      description: "Temporary tab-specific data like auth redirects and form drafts.",
      icon: Layers,
      action: async () => {
        const count = sessionStorage.length;
        sessionStorage.clear();
        return { cleared: true, detail: `${count} items cleared` };
      },
    },
    {
      key: "cacheAPI",
      label: "Browser Cache (Service Workers)",
      description: "Offline assets and cached API responses stored by the browser.",
      icon: Globe,
      action: async () => {
        if (!("caches" in window)) return { cleared: true, detail: "No Cache API available" };
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        return { cleared: true, detail: `${cacheNames.length} cache(s) deleted` };
      },
    },
  ];

  const clearSingle = async (target: CacheTarget) => {
    setClearing(target.key);
    try {
      const result = await target.action();
      setCleared(prev => ({ ...prev, [target.key]: { success: result.cleared, detail: result.detail } }));
      toast.success(`${target.label} cleared`, { description: result.detail });
    } catch (err) {
      console.error(`Failed to clear ${target.key}:`, err);
      setCleared(prev => ({ ...prev, [target.key]: { success: false, detail: "Failed" } }));
      toast.error(`Failed to clear ${target.label}`);
    } finally {
      setClearing(null);
    }
  };

  const clearAll = async () => {
    setClearingAll(true);
    setCleared({});
    for (const target of cacheTargets) {
      try {
        const result = await target.action();
        setCleared(prev => ({ ...prev, [target.key]: { success: result.cleared, detail: result.detail } }));
      } catch {
        setCleared(prev => ({ ...prev, [target.key]: { success: false, detail: "Failed" } }));
      }
    }
    setClearingAll(false);
    toast.success("All caches cleared successfully!");
  };

  const allCleared = cacheTargets.every(t => cleared[t.key]?.success);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6 text-foreground">Clear Caches</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Clear cached data to see the latest changes across the site. Your admin session will always be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {cacheTargets.map((target) => {
              const status = cleared[target.key];
              const isClearing = clearing === target.key;

              return (
                <div
                  key={target.key}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    status?.success
                      ? "border-green-500/30 bg-green-500/5"
                      : status && !status.success
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <target.icon className={`w-5 h-5 mt-0.5 shrink-0 ${status?.success ? "text-green-500" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{target.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{target.description}</p>
                      {status?.detail && (
                        <p className={`text-xs mt-1 font-medium ${status.success ? "text-green-600" : "text-destructive"}`}>
                          {status.success ? "✓" : "✗"} {status.detail}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearSingle(target)}
                    disabled={isClearing || clearingAll}
                    className="ml-3 shrink-0"
                  >
                    {isClearing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : status?.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={clearAll}
              disabled={clearingAll || !!clearing}
              variant="destructive"
            >
              {clearingAll ? (
                <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Clearing All...</>
              ) : allCleared ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> All Cleared</>
              ) : (
                <><Trash2 className="w-4 h-4 mr-2" /> Clear All Caches</>
              )}
            </Button>
            {allCleared && (
              <p className="text-xs text-green-600 font-medium">Everything is fresh — reload the page to see latest data.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClearCache;