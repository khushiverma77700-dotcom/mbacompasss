import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Database, FileCode2, Globe, ShieldCheck, AlertTriangle, ExternalLink,
  CheckCircle2, Circle, Server, Lock, Code2, Image as ImageIcon, RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

interface AuditCheck {
  id: string;
  title: string;
  wpEquivalent: string;
  description: string;
  how: string[];
  link?: { label: string; to: string; external?: boolean };
  severity: "high" | "medium" | "low";
}

const AUDIT_GROUPS: Array<{ title: string; icon: any; description: string; checks: AuditCheck[] }> = [
  {
    title: "Public folder & static assets",
    icon: FileCode2,
    description: "Equivalent of WordPress's public_html scan. Look for files you didn't put there.",
    checks: [
      {
        id: "public-files",
        title: "Audit /public folder for unknown files",
        wpEquivalent: "WordPress: scan public_html for wp-feed.php, hello.php, random-named PHP files",
        description: "Your /public folder should only contain: favicon, brand logo, OG image, robots.txt, sitemap.xml, and one Google Search Console verification file. Anything else is suspicious.",
        how: [
          "Already audited ✓ — only legitimate files present (favicon.png, mbacompass-logo.png, og-image.png, robots.txt, sitemap.xml, placeholder.svg, Google verification .txt).",
          "If new files appear in future, especially .html, .php, random hex names — investigate immediately.",
          "Re-audit anytime by asking the AI to 'scan public folder for suspicious files'.",
        ],
        severity: "high",
      },
      {
        id: "uploads-bucket",
        title: "Scan user-uploaded files (Storage buckets)",
        wpEquivalent: "WordPress: scan /wp-content/uploads for malicious uploads",
        description: "User uploads go to your 'uploads' and 'listing-uploads' Storage buckets — not your public folder. Check for unexpected file types (.html, .js, .php, .exe, .svg with scripts).",
        how: [
          "Open backend → Storage → uploads / listing-uploads.",
          "Filter by file type — only images (.jpg/.png/.webp) and PDFs are expected.",
          "Any .html, .js, .svg, .php = delete immediately and check who uploaded it.",
          "SVG files can contain JavaScript — block them or sanitize via a Storage policy.",
        ],
        link: { label: "Open Storage", to: "/admin", external: false },
        severity: "high",
      },
    ],
  },
  {
    title: "Database integrity (Lovable Cloud equivalent of phpMyAdmin)",
    icon: Database,
    description: "WordPress checks wp_options for siteurl/home tampering. Your equivalent is the site_settings table.",
    checks: [
      {
        id: "site-settings",
        title: "Verify site_settings hasn't been tampered with",
        wpEquivalent: "WordPress: check wp_options.siteurl and wp_options.home for hijacked URLs",
        description: "Confirm your site name, primary domain, contact email, and any redirect URLs in Site Settings still point to your own domain.",
        how: [
          "Open Admin → Site Settings.",
          "Verify site name = 'MBA Compass', domain = mbacompass.in, contact emails are yours.",
          "Check no fields contain unfamiliar URLs (especially redirect URLs, OAuth callbacks).",
          "If Google OAuth redirect URLs were changed to anything unfamiliar — that's a red flag.",
        ],
        link: { label: "Open Site Settings", to: "/admin/site-settings" },
        severity: "high",
      },
      {
        id: "admin-users",
        title: "Verify admin user list",
        wpEquivalent: "WordPress: check wp_users for unauthorized admin accounts",
        description: "Confirm only YOUR admin accounts have access. Hackers often add a hidden admin user as a backdoor.",
        how: [
          "Open Admin → Manage Admins.",
          "Verify every email listed is one you recognize and authorized.",
          "Remove any admin you don't recognize immediately.",
          "Rotate password and Google OAuth review for any suspicious account.",
        ],
        link: { label: "Open Manage Admins", to: "/admin/manage-admins" },
        severity: "high",
      },
      {
        id: "content-injection",
        title: "Scan published content for injected scripts/links",
        wpEquivalent: "WordPress: search wp_posts for eval(base64_decode( and suspicious links",
        description: "Articles, college descriptions, and other rich-text content can be vectors for hidden links to spammy/phishing sites.",
        how: [
          "Open Admin → Articles, then Colleges, Institutes, Blog.",
          "Skim recent edits for: hidden iframes, JavaScript redirects, links to unknown domains, viagra/casino/payday-loan keywords.",
          "Search across content for: 'base64', 'eval(', 'javascript:', '<iframe', 'document.location'.",
          "If found, edit the entry to remove and check the audit log for who made the edit.",
        ],
        link: { label: "Open Articles", to: "/admin/articles" },
        severity: "medium",
      },
    ],
  },
  {
    title: "Configuration & deployment integrity",
    icon: Server,
    description: "WordPress equivalent of wp-config.php and .htaccess checks. Your config lives in code (deployed via Lovable).",
    checks: [
      {
        id: "deploy-source",
        title: "Code is deployed only from Lovable",
        wpEquivalent: "WordPress: check wp-config.php and .htaccess for injected redirect rules",
        description: "Unlike WordPress, your code can't be modified by a hacker uploading files — it's rebuilt from your Lovable project on every publish.",
        how: [
          "✓ All code lives in Lovable's git-managed source.",
          "✓ No FTP / SSH / file manager exposes your source files.",
          "✓ Index.html, _redirects, and headers are generated at build time — not editable post-deploy.",
          "✓ Edge functions deploy from version-controlled source on Lovable Cloud.",
          "Risk surface is essentially zero for the WordPress-style 'injected file' attack.",
        ],
        severity: "low",
      },
      {
        id: "secrets",
        title: "Verify no leaked API keys or secrets",
        wpEquivalent: "WordPress: check wp-config.php for leaked DB credentials",
        description: "Make sure no API keys/secrets are exposed to the browser or in public files.",
        how: [
          "Only PUBLISHABLE/anon keys may appear in client code (these are safe).",
          "All sensitive secrets live in Edge Function environment (Lovable Cloud → Connectors / Secrets).",
          "✓ FIRECRAWL_API_KEY, GEMINI_API_KEY, TWILIO, MSG91, etc. are server-side only.",
          "If you suspect a leak, rotate the key in Connectors → Secrets immediately.",
        ],
        severity: "high",
      },
      {
        id: "edge-functions",
        title: "Review edge function deployment list",
        wpEquivalent: "WordPress: check for unknown plugins / mu-plugins",
        description: "Confirm no rogue edge functions exist. Functions deploy from your Lovable source — but worth a sanity check.",
        how: [
          "Open backend → Edge Functions.",
          "Every function should match a folder under supabase/functions/ in your project.",
          "If you see a function name you don't recognize — investigate immediately.",
        ],
        severity: "medium",
      },
    ],
  },
  {
    title: "Third-party scripts & external resources",
    icon: Code2,
    description: "Check what loads in the user's browser. Most Safe Browsing flags come from external scripts.",
    checks: [
      {
        id: "third-party-scripts",
        title: "Audit all <script> sources",
        wpEquivalent: "WordPress: scan theme/plugin files for foreign script injections",
        description: "Only Google Analytics (gtag) should load externally. No ad networks, no popups, no trackers.",
        how: [
          "Already audited ✓ — only googletagmanager.com (GA4) is loaded externally.",
          "✓ No fbq, TikTok pixel, Hotjar, Clarity, AdSense, DoubleClick, popunder networks.",
          "If a network request to an unfamiliar domain appears, investigate immediately.",
        ],
        severity: "high",
      },
      {
        id: "outbound-links",
        title: "Check outbound links don't point to flagged sites",
        wpEquivalent: "WordPress: scan wp_posts for links to spammy domains",
        description: "Use Admin → All Site Links to see every outbound link on your site.",
        how: [
          "Open Admin → All Site Links.",
          "Scan for unfamiliar destination domains.",
          "Especially check 'website' and 'cta_link' fields on colleges/institutes/banners.",
          "Run a spot check on top 20 referenced URLs through Google Safe Browsing.",
        ],
        link: { label: "Open All Site Links", to: "/admin/all-links" },
        severity: "medium",
      },
    ],
  },
];

const SEVERITY_STYLES: Record<string, string> = {
  high: "border-red-500/30 bg-red-500/5",
  medium: "border-amber-500/30 bg-amber-500/5",
  low: "border-emerald-500/30 bg-emerald-500/5",
};

const SEVERITY_BADGE: Record<string, string> = {
  high: "bg-red-500/15 text-red-700 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  low: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const StackSpecificAudit = () => {
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("sb_stack_audit_progress") || "{}");
    } catch {
      return {};
    }
  });

  const toggle = (id: string) => {
    const next = { ...completed, [id]: !completed[id] };
    setCompleted(next);
    localStorage.setItem("sb_stack_audit_progress", JSON.stringify(next));
  };

  const allChecks = AUDIT_GROUPS.flatMap(g => g.checks);
  const doneCount = allChecks.filter(c => completed[c.id]).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          Stack-Specific Audit (Lovable Cloud equivalent of WordPress checks)
        </CardTitle>
        <CardDescription>
          Your site doesn't run on WordPress, Hostinger, or PHP — so file-injection attacks against{" "}
          <code className="text-xs">wp-config.php</code> or <code className="text-xs">public_html</code> don't apply.
          Below is the equivalent audit translated for your React + Lovable Cloud (Supabase) stack.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Server className="w-4 h-4 text-blue-600" />
          <AlertTitle>Why most WordPress checks don't apply</AlertTitle>
          <AlertDescription className="space-y-1.5">
            <p>• <strong>No PHP files</strong> — your app is React + TypeScript, compiled to static assets at build time.</p>
            <p>• <strong>No file manager / FTP</strong> — code is deployed only via Lovable's source-control flow.</p>
            <p>• <strong>No .htaccess / wp-config</strong> — routing and config live in versioned code, not editable on the server.</p>
            <p>• <strong>No phpMyAdmin</strong> — your DB is Supabase Postgres with RLS protecting every table.</p>
            <p className="pt-1.5">The <strong>realistic risk surface</strong> is: user-uploaded files, content injection in CMS fields, leaked API keys, and unauthorized admin accounts. The audit below covers all four.</p>
          </AlertDescription>
        </Alert>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((doneCount / allChecks.length) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums shrink-0">
            {doneCount}/{allChecks.length} checks done
          </span>
        </div>

        {/* Audit groups */}
        {AUDIT_GROUPS.map(group => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="space-y-3">
              <div className="flex items-start gap-2">
                <Icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold">{group.title}</h3>
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
              </div>

              <div className="space-y-2 pl-7">
                {group.checks.map(check => {
                  const done = completed[check.id];
                  return (
                    <div
                      key={check.id}
                      className={`p-4 rounded-lg border transition-all ${
                        done ? "border-emerald-500/40 bg-emerald-500/5 opacity-75" : SEVERITY_STYLES[check.severity]
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggle(check.id)}
                          className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                          aria-label={done ? "Mark incomplete" : "Mark complete"}
                        >
                          {done ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{check.title}</h4>
                            <Badge variant="outline" className={SEVERITY_BADGE[check.severity]}>
                              {check.severity} risk
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground italic">
                            🐘 WP equivalent: {check.wpEquivalent}
                          </p>
                          <p className="text-sm">{check.description}</p>
                          <ul className="space-y-1 text-xs">
                            {check.how.map((h, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0">→</span>
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                          {check.link && (
                            <Button asChild size="sm" variant="outline" className="mt-1">
                              {check.link.external ? (
                                <a href={check.link.to} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-3.5 h-3.5 mr-2" /> {check.link.label}
                                </a>
                              ) : (
                                <Link to={check.link.to}>
                                  <ExternalLink className="w-3.5 h-3.5 mr-2" /> {check.link.label}
                                </Link>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Restore equivalent */}
        <Alert>
          <RefreshCw className="w-4 h-4" />
          <AlertTitle>"Restore from backup" equivalent (WordPress Step 5)</AlertTitle>
          <AlertDescription>
            On WordPress you'd restore files + DB from a Hostinger snapshot. On Lovable, you can:
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Code:</strong> revert to any previous version using Lovable's version history (every change is a checkpoint).</li>
              <li>• <strong>Database:</strong> use Admin → Database Backup to download/restore a Postgres snapshot.</li>
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/admin/database-backup">
                <Database className="w-3.5 h-3.5 mr-2" /> Open Database Backup
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default StackSpecificAudit;
