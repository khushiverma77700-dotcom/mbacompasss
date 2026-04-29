import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  Sparkles,
  CalendarCheck,
  BarChart3,
  BookOpenCheck,
  Lock,
  Mail,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(location.search);
  const redirectTo = params.get("redirect") || "/student";
  const reason = params.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(
    reason === "no-course"
      ? "No active course found on this account. Please purchase a course to access the student dashboard."
      : null,
  );

  // If already logged in AND has access, send to dashboard.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        const hasAccess = await checkCourseAccess(session.user.id);
        if (hasAccess) {
          navigate(redirectTo, { replace: true });
          return;
        }
        // Logged in but no course → sign out so login screen is clean.
        await supabase.auth.signOut();
      }
      setCheckingSession(false);
    })();
    return () => { cancelled = true; };
  }, [navigate, redirectTo]);

  const checkCourseAccess = async (userId: string): Promise<boolean> => {
    const [mocks, bundles, courses] = await Promise.all([
      supabase.from("mock_enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("mock_bundle_enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("course_enrollments").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    return (mocks.count ?? 0) > 0 || (bundles.count ?? 0) > 0 || (courses.count ?? 0) > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError || !data.user) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }
      const hasAccess = await checkCourseAccess(data.user.id);
      if (!hasAccess) {
        await supabase.auth.signOut();
        setError("No active course found on this account. Please purchase a course to access the student dashboard.");
        setLoading(false);
        return;
      }
      toast({ title: "Welcome back!", description: "Loading your dashboard…" });
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* LEFT — Login form */}
      <div className="flex items-center justify-center px-6 py-10 sm:px-12 bg-white">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Link to="/" className="inline-flex items-center gap-2 mb-10 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">MBA Compass</div>
              <div className="text-[11px] text-slate-500">Student LMS</div>
            </div>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access your personalized student dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-11 bg-white border-slate-200 focus-visible:ring-sky-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 h-11 bg-white border-slate-200 focus-visible:ring-sky-500"
                />
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-sky-600 hover:text-sky-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-md shadow-sky-500/20 transition-all"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-sky-100 grid place-items-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">Don't have an account?</span>{" "}
                Student accounts are created automatically after course purchase.{" "}
                <Link to="/courses" className="text-sky-600 font-medium hover:underline">
                  Browse courses →
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-[11px] text-slate-400">
            Protected by industry-standard encryption · MBA Compass © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* RIGHT — Premium visual */}
      <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-sky-900">
        {/* Decorative orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-sky-500/30 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" style={{ animation: "pulse 6s ease-in-out infinite" }} />
          <div className="absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" style={{ animation: "pulse 8s ease-in-out infinite" }} />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        <div className="relative z-10 h-full flex flex-col justify-between p-12 xl:p-16 text-white">
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-700">
            <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur grid place-items-center border border-white/20">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-wide text-white/80">MBA Compass · Student LMS</span>
          </div>

          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/90">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Trusted by 50,000+ MBA aspirants
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
              India's Most Advanced
              <br />
              <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                CAT &amp; OMET Mock Platform
              </span>
            </h2>

            <p className="text-base text-white/70 max-w-md leading-relaxed">
              AI-powered practice, personalized study plans, and analytics built for serious aspirants.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-lg pt-2">
              <FeatureChip
                icon={<Sparkles className="h-4 w-4" />}
                title="Personalized Hub"
                desc="AI-curated mocks across CAT, NMAT, XAT, SNAP & more"
                delay="delay-100"
              />
              <FeatureChip
                icon={<CalendarCheck className="h-4 w-4" />}
                title="Daily Planner"
                desc="Smart schedule with streaks & XP rewards"
                delay="delay-200"
              />
              <FeatureChip
                icon={<BookOpenCheck className="h-4 w-4" />}
                title="Mock Tests"
                desc="Full-length, sectional & topic-wise practice"
                delay="delay-300"
              />
              <FeatureChip
                icon={<BarChart3 className="h-4 w-4" />}
                title="Performance Analytics"
                desc="Deep insights, percentile & weak-area heatmaps"
                delay="delay-[400ms]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50 animate-in fade-in duration-1000">
            <div>© {new Date().getFullYear()} MBA Compass. All rights reserved.</div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure SSL encrypted login
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: string;
}) {
  return (
    <div
      className={`group rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${delay} duration-700`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-400/30 to-blue-500/30 border border-white/10 grid place-items-center text-sky-200 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="text-sm font-semibold text-white">{title}</div>
      </div>
      <div className="text-[11px] text-white/60 leading-snug">{desc}</div>
    </div>
  );
}
