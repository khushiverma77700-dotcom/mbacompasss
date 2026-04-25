import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Copy,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Globe,
  Search,
  FileSearch,
  Send,
  Clock,
  Mail,
  ListChecks,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DOMAIN = "mbacompass.in";
const SEARCH_CONSOLE_URL = `https://search.google.com/search-console?resource_id=sc-domain%3A${DOMAIN}`;
const SAFE_BROWSING_STATUS_URL = `https://transparencyreport.google.com/safe-browsing/search?url=${DOMAIN}`;
const REPORT_INCORRECT_URL = "https://safebrowsing.google.com/safebrowsing/report_error/";

const reviewMessage = `Hello Google Safe Browsing Team,

Our domain (${DOMAIN}) has been flagged as "Deceptive site" / "Social engineering content" in Search Console.

We have completed a full audit of the site:

1. We confirmed there are no phishing forms, fake login pages, or impersonation of any other brand.
2. We removed/verified all third-party scripts on the site. Only Google Analytics (GA4) is loaded.
3. Our public asset folders contain only legitimate assets (favicon, brand logo, OG image, sitemap, robots.txt, and the Google Search Console verification file).
4. Our login page now clearly identifies our brand (MBA Compass) and includes Privacy Policy, Terms, and Contact links along with an explicit notice that we never request payment, OTPs, or banking details on the login page.
5. We use Supabase Auth + Google OAuth — no fake "verify your account" or urgency-style messaging.
6. We have scanned for any file uploads or injected content and found none.

MBA Compass is a legitimate Indian MBA discovery platform that helps students compare colleges and coaching institutes. We have not been compromised.

Please re-review the site at your earliest convenience. We are happy to provide any additional information needed.

Thank you,
MBA Compass Team`;

interface Step {
  id: number;
  title: string;
  duration: string;
  icon: any;
  description: string;
  actions: Array<{ label: string; type: "link" | "copy" | "info"; value?: string; variant?: string }>;
  details: string[];
}

const STEPS: Step[] = [
  {
    id: 1,
    title: "Check the current Safe Browsing status",
    duration: "1 min",
    icon: Search,
    description: "Confirm the flag is still active and capture exactly what Google reports for your domain.",
    actions: [
      { label: "Open Safe Browsing status page", type: "link", value: SAFE_BROWSING_STATUS_URL },
    ],
    details: [
      `Visit Google's Safe Browsing Transparency Report for ${DOMAIN}.`,
      'If the page shows "No unsafe content found" — the flag is already gone (Search Console may take 24-72h to update).',
      'If it shows "Some pages on this website install malware" or "Deceptive site ahead", proceed to Step 2.',
      "Take a screenshot of the report — useful evidence for your review request.",
    ],
  },
  {
    id: 2,
    title: "Open Google Search Console → Security Issues",
    duration: "2 min",
    icon: ShieldAlert,
    description: "Find the exact reason Google flagged the domain and the list of affected URLs.",
    actions: [
      { label: "Open Search Console", type: "link", value: SEARCH_CONSOLE_URL },
    ],
    details: [
      `Sign in with the Google account that owns the ${DOMAIN} property.`,
      'In the left sidebar, click Security & Manual Actions → Security Issues.',
      'You should see "Deceptive pages" or "Social engineering content" with a list of sample URLs.',
      "Click each sample URL and review what Google flagged (often a login form, download button, or third-party iframe).",
      "Copy the list of flagged URLs — you'll reference them in your review request.",
    ],
  },
  {
    id: 3,
    title: "Verify the site is clean (audit checklist)",
    duration: "10 min",
    icon: FileSearch,
    description: "Before requesting review, confirm there is nothing on your site that could re-trigger the flag.",
    actions: [
      { label: "View public folder audit (already done ✓)", type: "info" },
    ],
    details: [
      "✓ No phishing forms or fake login pages impersonating banks/Google/etc.",
      "✓ No suspicious files in /public (only favicon, logos, sitemap, robots.txt, Google verification file).",
      "✓ No third-party ad networks, popups, or trackers besides Google Analytics.",
      "✓ Login page has explicit brand identity + Privacy/Terms/Contact links (added).",
      "✓ Login page has anti-phishing notice (added).",
      "✓ No deceptive language ('You won!', 'Verify account NOW', fake download buttons).",
      "✓ All forms use HTTPS and submit to your own backend (Supabase).",
      "If any sample URL from Step 2 has a problem, fix it FIRST — submitting review on a still-flagged page will fail.",
    ],
  },
  {
    id: 4,
    title: "Click 'REQUEST REVIEW' inside Search Console",
    duration: "5 min",
    icon: Send,
    description: "Submit your formal request explaining what you fixed and why the site is safe.",
    actions: [
      { label: "Copy review message template", type: "copy", value: reviewMessage },
      { label: "Open Search Console again", type: "link", value: SEARCH_CONSOLE_URL },
    ],
    details: [
      "On the Security Issues page in Search Console, scroll to the bottom and click REQUEST REVIEW.",
      "A textbox will appear asking you to describe what you fixed.",
      "Paste the template message (use the Copy button on the left) and customize it with anything specific to your case.",
      "Be honest, specific, and concise. Vague requests like 'please re-check' get rejected.",
      "List the exact actions taken: removed file X, fixed login page Y, audited assets, etc.",
      "Submit the request.",
    ],
  },
  {
    id: 5,
    title: "Wait for Google's automated re-scan",
    duration: "1-3 days (sometimes up to 14)",
    icon: Clock,
    description: "Google will crawl your site again and verify the issues are resolved.",
    actions: [
      { label: "Re-check Safe Browsing status", type: "link", value: SAFE_BROWSING_STATUS_URL },
    ],
    details: [
      "Most reviews complete in 24-72 hours.",
      "Complex cases (or repeat offenders) can take up to 14 days.",
      "You'll get an email at the Search Console owner address when the review completes.",
      "If approved → flag is removed and Chrome stops showing the warning within hours.",
      "If rejected → the email lists what's still wrong. Fix it, then submit a new request.",
    ],
  },
  {
    id: 6,
    title: "If rejected: fix and resubmit",
    duration: "Variable",
    icon: AlertTriangle,
    description: "Most rejections happen because Google found a missed issue. Address it and try again.",
    actions: [
      { label: "Report incorrect flag (only if you're sure it's a false positive)", type: "link", value: REPORT_INCORRECT_URL },
    ],
    details: [
      "Read the rejection email carefully — it usually lists the specific URL or content that still violates policy.",
      "Common causes: cached old content, a forgotten redirect, an iframe loading a flagged third-party.",
      "Fix the issue, deploy, then submit a NEW review request from Search Console.",
      "If you've fixed everything and Google still rejects, use 'Report Incorrect Phishing Warning' (link on the left) — but only as a last resort.",
    ],
  },
];

const AdminSafeBrowsingGuide = () => {
  const { toast } = useToast();
  const [completed, setCompleted] = useState<Record<number, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("safe_browsing_guide_progress") || "{}");
    } catch {
      return {};
    }
  });

  const toggleStep = (id: number) => {
    const next = { ...completed, [id]: !completed[id] };
    setCompleted(next);
    localStorage.setItem("safe_browsing_guide_progress", JSON.stringify(next));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard ✓", description: "Paste it into Search Console's review request box." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
    }
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
          <h1 className="font-heading text-3xl font-bold">Google Safe Browsing — Request Review Guide</h1>
        </div>
        <p className="text-muted-foreground">
          Step-by-step instructions to remove the "Deceptive site" warning on{" "}
          <span className="font-semibold text-foreground">{DOMAIN}</span>.
        </p>
      </div>

      {/* What this is */}
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <AlertTitle>What's happening?</AlertTitle>
        <AlertDescription>
          Google Safe Browsing has flagged <strong>{DOMAIN}</strong> as a "Deceptive site". This is a{" "}
          <strong>domain-level classification by Google</strong>, not a bug in your code. Only the domain owner can
          clear it by completing the steps below in Google Search Console. Code changes alone won't fix it.
        </AlertDescription>
      </Alert>

      {/* Progress + Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> Your progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium tabular-nums">
                {completedCount}/{STEPS.length} steps
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tick steps off as you complete them — progress is saved in your browser.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> Quick links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <a href={SEARCH_CONSOLE_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-2" /> Search Console
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full justify-start">
              <a href={SAFE_BROWSING_STATUS_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-2" /> Check status
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isDone = completed[step.id];
          return (
            <Card
              key={step.id}
              className={`transition-all ${isDone ? "border-emerald-500/40 bg-emerald-500/5" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="mt-1 shrink-0 transition-transform hover:scale-110"
                    aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono">Step {step.id}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" /> {step.duration}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      {step.title}
                    </CardTitle>
                    <CardDescription className="mt-1">{step.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pl-16">
                <ul className="space-y-2">
                  {step.details.map((detail, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <span className="text-muted-foreground shrink-0">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>

                {step.actions.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-2">
                      {step.actions.map((action, i) => {
                        if (action.type === "link") {
                          return (
                            <Button key={i} asChild size="sm">
                              <a href={action.value} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                {action.label}
                              </a>
                            </Button>
                          );
                        }
                        if (action.type === "copy") {
                          return (
                            <Button
                              key={i}
                              size="sm"
                              variant="secondary"
                              onClick={() => copy(action.value!)}
                            >
                              <Copy className="w-3.5 h-3.5 mr-2" />
                              {action.label}
                            </Button>
                          );
                        }
                        return (
                          <Badge key={i} variant="outline" className="text-emerald-600 border-emerald-500/40">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            {action.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Review template preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Review request template (full text)
          </CardTitle>
          <CardDescription>
            Copy this message and paste it into Search Console's "Request Review" textbox in Step 4.
            Customize anything in [brackets] and remove items that don't apply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto">
              {reviewMessage}
            </pre>
            <Button
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copy(reviewMessage)}
            >
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workaround tip */}
      <Alert>
        <ShieldCheck className="w-4 h-4" />
        <AlertTitle>While you wait</AlertTitle>
        <AlertDescription>
          Your other domains are not affected. Use{" "}
          <strong>bschoolbuzz.com</strong>, <strong>bestmbacoaching.com</strong>, or the Lovable preview URL for
          logins and sharing until Google clears the flag on {DOMAIN}.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AdminSafeBrowsingGuide;
