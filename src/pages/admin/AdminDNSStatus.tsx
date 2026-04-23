import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, RefreshCw, Globe, AlertTriangle, Loader2 } from "lucide-react";

/**
 * DNS Propagation Status — verifies that mbacompass.in @ + www
 * resolve ONLY to Lovable's IP (185.158.133.1) across multiple
 * public DNS-over-HTTPS resolvers. Flags any stray records (e.g.
 * old Hostinger parking IP 2.57.91.91).
 */

const LOVABLE_IP = "185.158.133.1";
const DOMAIN = "mbacompass.in";
const HOSTS = [`${DOMAIN}`, `www.${DOMAIN}`];

const RESOLVERS = [
  { name: "Google", url: "https://dns.google/resolve" },
  { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query" },
];

interface DnsAnswer {
  name: string;
  data: string;
  type: number;
}

interface CheckResult {
  resolver: string;
  host: string;
  ips: string[];
  ok: boolean;
  hasStray: boolean;
  hasLovable: boolean;
  error?: string;
}

const queryDoh = async (resolverUrl: string, host: string): Promise<string[]> => {
  const res = await fetch(`${resolverUrl}?name=${encodeURIComponent(host)}&type=A`, {
    headers: { Accept: "application/dns-json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const answers: DnsAnswer[] = json.Answer ?? [];
  return answers.filter((a) => a.type === 1).map((a) => a.data);
};

const AdminDNSStatus = () => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    const tasks: Promise<CheckResult>[] = [];
    for (const r of RESOLVERS) {
      for (const h of HOSTS) {
        tasks.push(
          queryDoh(r.url, h)
            .then<CheckResult>((ips) => ({
              resolver: r.name,
              host: h,
              ips,
              hasLovable: ips.includes(LOVABLE_IP),
              hasStray: ips.some((ip) => ip !== LOVABLE_IP),
              ok: ips.length > 0 && ips.every((ip) => ip === LOVABLE_IP),
            }))
            .catch<CheckResult>((err) => ({
              resolver: r.name,
              host: h,
              ips: [],
              ok: false,
              hasLovable: false,
              hasStray: false,
              error: err?.message ?? "Lookup failed",
            })),
        );
      }
    }
    const out = await Promise.all(tasks);
    setResults(out);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const allClean = results.length > 0 && results.every((r) => r.ok);
  const anyStray = results.some((r) => r.hasStray);
  const anyMissing = results.some((r) => !r.hasLovable && !r.error);

  // Aggregate stray IPs for the warning banner
  const strayIps = Array.from(
    new Set(results.flatMap((r) => r.ips.filter((ip) => ip !== LOVABLE_IP))),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            DNS Propagation Status
          </h1>
          <p className="text-muted-foreground mt-1">
            Live check that <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{DOMAIN}</code>{" "}
            resolves only to Lovable's IP{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">{LOVABLE_IP}</code>.
          </p>
        </div>
        <Button onClick={runCheck} disabled={loading} variant="outline">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Re-check now
        </Button>
      </div>

      {/* Summary banner */}
      {results.length > 0 && (
        <Alert
          variant={allClean ? "default" : "destructive"}
          className={allClean ? "border-green-500/40 bg-green-500/5" : undefined}
        >
          {allClean ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>
            {allClean
              ? "DNS is fully propagated and clean"
              : anyStray
                ? "Stray DNS records detected"
                : anyMissing
                  ? "Lovable record missing on at least one host"
                  : "Issues detected"}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            {allClean && (
              <p>
                Both <code>@</code> and <code>www</code> resolve to <code>{LOVABLE_IP}</code> across all tested
                resolvers. No old/parking IPs remain.
              </p>
            )}
            {anyStray && (
              <p>
                Remove these unwanted A record(s) from your DNS provider:{" "}
                {strayIps.map((ip) => (
                  <code key={ip} className="ml-1 px-1.5 py-0.5 rounded bg-background border text-foreground">
                    {ip}
                  </code>
                ))}
              </p>
            )}
            {anyMissing && !anyStray && (
              <p>
                The required Lovable A record (<code>{LOVABLE_IP}</code>) is missing on one or more hosts. Add
                an A record pointing <code>@</code> and <code>www</code> to <code>{LOVABLE_IP}</code>.
              </p>
            )}
            {lastChecked && (
              <p className="text-xs text-muted-foreground pt-1">
                Last checked: {lastChecked.toLocaleString()}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Results grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {RESOLVERS.flatMap((r) =>
          HOSTS.map((h) => {
            const result = results.find((x) => x.resolver === r.name && x.host === h);
            return (
              <Card key={`${r.name}-${h}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-semibold">{h}</CardTitle>
                    {result ? (
                      result.ok ? (
                        <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/20 border-green-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Clean
                        </Badge>
                      ) : result.error ? (
                        <Badge variant="secondary">Error</Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="w-3 h-3 mr-1" />
                          {result.hasStray ? "Stray IPs" : "Missing"}
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary">
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Checking
                      </Badge>
                    )}
                  </div>
                  <CardDescription>Resolver: {r.name} (DoH)</CardDescription>
                </CardHeader>
                <CardContent>
                  {result?.error ? (
                    <p className="text-sm text-destructive">{result.error}</p>
                  ) : result && result.ips.length > 0 ? (
                    <ul className="space-y-1.5">
                      {result.ips.map((ip) => {
                        const isLovable = ip === LOVABLE_IP;
                        return (
                          <li
                            key={ip}
                            className={`flex items-center justify-between gap-2 text-sm font-mono px-2.5 py-1.5 rounded border ${
                              isLovable
                                ? "border-green-500/30 bg-green-500/5 text-foreground"
                                : "border-destructive/40 bg-destructive/5 text-destructive"
                            }`}
                          >
                            <span>{ip}</span>
                            <span className="text-xs font-sans">
                              {isLovable ? "Lovable ✓" : "Remove this record"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : result ? (
                    <p className="text-sm text-muted-foreground">No A records returned.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Querying…</p>
                  )}
                </CardContent>
              </Card>
            );
          }),
        )}
      </div>

      {/* How to fix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to fix stray records</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            1. Sign in to your DNS provider (e.g. Hostinger → Domains → {DOMAIN} → DNS / Nameservers).
          </p>
          <p>
            2. Delete every A record on <code>@</code> and <code>www</code> whose value is{" "}
            <strong>not</strong> <code>{LOVABLE_IP}</code>.
          </p>
          <p>
            3. Make sure exactly one A record exists for each: <code>@ → {LOVABLE_IP}</code> and{" "}
            <code>www → {LOVABLE_IP}</code>.
          </p>
          <p>4. Wait 5–60 min and click <strong>Re-check now</strong> until the banner turns green.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDNSStatus;
