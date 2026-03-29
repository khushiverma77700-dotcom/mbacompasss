import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const CACHE_TARGETS = [
  { key: "localStorage", label: "Local Storage", description: "Cached settings, preferences, and session data" },
  { key: "sessionStorage", label: "Session Storage", description: "Temporary session data and auth redirects" },
  { key: "cacheAPI", label: "Browser Cache (Service Workers)", description: "Cached assets, API responses, and offline data" },
];

const AdminClearCache = () => {
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState<string[]>([]);

  const clearAllCaches = async () => {
    setClearing(true);
    setCleared([]);
    const results: string[] = [];

    try {
      // Clear localStorage (except auth token to keep admin logged in)
      const authKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("sb-") || key === "supabase.auth.token")) {
          authKeys.push(key);
        }
      }
      const authData = authKeys.map(k => ({ k, v: localStorage.getItem(k) }));
      localStorage.clear();
      authData.forEach(({ k, v }) => { if (v) localStorage.setItem(k, v); });
      results.push("localStorage");

      // Clear sessionStorage
      sessionStorage.clear();
      results.push("sessionStorage");

      // Clear Cache API (service worker caches)
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        if (cacheNames.length > 0) results.push("cacheAPI");
        else results.push("cacheAPI");
      }

      setCleared(results);
      toast.success("All caches cleared successfully!");
    } catch (err) {
      console.error("Cache clear error:", err);
      toast.error("Some caches could not be cleared.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6 text-foreground">Clear Caches</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Remove all unnecessary cached data from the browser. Your admin session will be preserved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {CACHE_TARGETS.map((target) => (
              <div
                key={target.key}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{target.label}</p>
                  <p className="text-xs text-muted-foreground">{target.description}</p>
                </div>
                {cleared.includes(target.key) && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={clearAllCaches}
            disabled={clearing}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            {clearing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Clearing...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> Clear All Caches</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClearCache;
