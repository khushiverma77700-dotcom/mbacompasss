import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Share, Plus, Smartphone, Sparkles, Zap, Bell, ArrowLeft, CheckCircle2 } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function StudentInstallPage() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    const isAndroid = /android/i.test(ua);
    setPlatform(isIos ? "ios" : isAndroid ? "android" : "desktop");

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <Link to="/student" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-sky-500/10 dark:via-background dark:to-blue-500/10 dark:border-sky-500/20 p-6 sm:p-10">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg shadow-sky-500/30">
              <Smartphone className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-sky-600 font-semibold">Web App</div>
              <h1 className="text-2xl sm:text-3xl font-bold">Install MBA Compass</h1>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Add the student dashboard to your home screen and use it like a real app — full-screen,
            one-tap launch, instant load, even works on slow networks.
          </p>

          {installed ? (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-4 py-3 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <div className="font-semibold text-sm">App installed</div>
                <div className="text-xs opacity-80">Look for the MBA Compass icon on your home screen.</div>
              </div>
            </div>
          ) : deferred ? (
            <button
              onClick={install}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-white font-semibold shadow-lg shadow-sky-500/30 hover:shadow-xl transition"
            >
              <Download className="h-4 w-4" />
              Install Now
            </button>
          ) : null}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Zap, title: "Faster", body: "Opens straight to your dashboard, no browser bar." },
              { icon: Bell, title: "Updates", body: "Stay close to mocks, planner & announcements." },
              { icon: Sparkles, title: "Native feel", body: "Full-screen experience, like a phone app." },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-sky-100/70 bg-white/70 dark:bg-card/70 dark:border-sky-500/15 backdrop-blur p-4">
                  <Icon className="h-5 w-5 text-sky-600 mb-2" />
                  <div className="font-semibold text-sm">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.body}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        <PlatformCard
          active={platform === "android"}
          title="Android (Chrome)"
          steps={[
            { icon: Share, text: "Tap the ⋮ menu (top-right) in Chrome." },
            { icon: Plus, text: 'Choose "Install app" or "Add to Home Screen".' },
            { icon: CheckCircle2, text: "Confirm. Open MBA Compass from your home screen." },
          ]}
        />
        <PlatformCard
          active={platform === "ios"}
          title="iPhone / iPad (Safari)"
          steps={[
            { icon: Share, text: "Tap the Share button at the bottom of Safari." },
            { icon: Plus, text: 'Scroll down and tap "Add to Home Screen".' },
            { icon: CheckCircle2, text: 'Tap "Add". The MBA Compass icon appears on your home screen.' },
          ]}
        />
        <PlatformCard
          active={platform === "desktop"}
          title="Desktop (Chrome / Edge)"
          steps={[
            { icon: Download, text: "Click the install icon in the address bar (right side)." },
            { icon: Plus, text: 'Or open the ⋮ menu and choose "Install MBA Compass".' },
            { icon: CheckCircle2, text: "App opens in its own window — pin it for fast access." },
          ]}
        />
      </div>
    </div>
  );
}

function PlatformCard({
  title,
  steps,
  active,
}: {
  title: string;
  steps: { icon: any; text: string }[];
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? "border-sky-300 bg-sky-50/60 dark:bg-sky-500/10 dark:border-sky-500/30 shadow-sm"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {active && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500 text-white font-semibold">
            Your device
          </span>
        )}
      </div>
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="h-6 w-6 shrink-0 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 grid place-items-center text-[11px] font-bold">
                {i + 1}
              </span>
              <span className="flex items-start gap-2">
                <Icon className="h-4 w-4 mt-0.5 text-sky-600 shrink-0" />
                <span className="text-foreground/90">{s.text}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
