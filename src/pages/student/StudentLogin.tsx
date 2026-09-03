import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { userHasPurchasedCourse, NO_PURCHASE_MESSAGE } from "@/lib/studentAccess";
import { getAuthRedirectUri, storePostAuthRedirect } from "@/lib/authRedirect";
import {
  GraduationCap,
  Sparkles,
  CalendarCheck,
  BarChart3,
  BookOpenCheck,
  Lock,
  Mail,
  Phone,
  Loader2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(location.search);
  const redirectParam = params.get("redirect");
  const isDemoFlow = redirectParam === "/demo" || params.get("reason") === "demo";
  const redirectTo = redirectParam?.startsWith("/student") || redirectParam === "/demo" ? redirectParam : "/student";
  const showTopDemoCta = !isDemoFlow;
  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gateChecking, setGateChecking] = useState(false);

  // If already logged in, verify purchase then route into LMS — otherwise sign
  // out and surface the "no account found" message.
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setGateChecking(true);
      if (isDemoFlow) {
        navigate(redirectTo, { replace: true });
        return;
      }
      const ok = await userHasPurchasedCourse(user.id);
      if (cancelled) return;
      if (ok) {
        navigate(redirectTo, { replace: true });
      } else {
        await supabase.auth.signOut({ scope: "local" });
        setError(NO_PURCHASE_MESSAGE);
        setGateChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, navigate, redirectTo, isDemoFlow]);

  const enforcePurchaseGate = async (userId: string) => {
    const ok = await userHasPurchasedCourse(userId);
    if (!ok) {
      await supabase.auth.signOut({ scope: "local" });
      setError(NO_PURCHASE_MESSAGE);
      return false;
    }
    return true;
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
      if (!isDemoFlow && !(await enforcePurchaseGate(data.user.id))) {
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

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      storePostAuthRedirect(redirectTo);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getAuthRedirectUri(),
      });
      if (result.error) throw result.error;
      // The useEffect above will gate the session once the redirect completes.
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
  };

  const handleDemoGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      storePostAuthRedirect("/demo");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getAuthRedirectUri(),
      });
      if (result.error) throw result.error;
    } catch (err: any) {
      setError(err?.message || "Google demo signup failed.");
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setError(null);
    setOtpSending(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (err) throw new Error(err.message);
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
      toast({ title: "OTP Sent", description: `Code sent to ${phone}.` });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP.");
      return;
    }
    setError(null);
    setOtpVerifying(true);
    try {
      const { data: signRes, error: signErr } = await supabase.functions.invoke("otp-sign-in", {
        body: { phone, otp },
      });
      if (signErr) throw new Error(signErr.message);
      if (signRes?.error) throw new Error(signRes.error);
      if (signRes?.noAccount) {
        setError(NO_PURCHASE_MESSAGE);
        return;
      }
      if (!signRes?.access_token || !signRes?.refresh_token) {
        throw new Error("Unable to complete sign-in.");
      }
      const { data: sessRes, error: sessErr } = await supabase.auth.setSession({
        access_token: signRes.access_token,
        refresh_token: signRes.refresh_token,
      });
      if (sessErr) throw sessErr;
      const uid = sessRes.user?.id;
      if (!uid || (!isDemoFlow && !(await enforcePurchaseGate(uid)))) return;
      toast({ title: "Signed in", description: "Loading your dashboard…" });
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message || "OTP sign-in failed.");
    } finally {
      setOtpVerifying(false);
    }
  };

  if (authLoading || gateChecking) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="h-[100svh] min-h-[560px] overflow-hidden grid lg:grid-cols-2 bg-white">
      {/* LEFT — Login form */}
      <div className="flex items-center justify-center px-4 py-3 sm:px-8 sm:py-6 lg:px-12 lg:py-10 bg-white">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 sm:mb-6 lg:mb-8 group">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">MBA Compass</div>
              <div className="hidden min-[380px]:block text-xs text-slate-500">Student LMS</div>
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-600">
            Sign in to access your personalized student dashboard.
          </p>

          {/* Top demo CTA removed — primary sign-in is the focus. Demo card lives below the form. */}


          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="mt-3 sm:mt-5 lg:mt-6 w-full h-9 sm:h-11 border-slate-200 text-sm"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </Button>

          <div className="relative my-3 sm:my-5 lg:my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-500">or</span>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-9 sm:h-10">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="mobile">Mobile OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-3 sm:mt-5">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="sr-only sm:not-sr-only text-slate-700">Email address</Label>
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
                      className="pl-10 h-9 sm:h-11 bg-white border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="sr-only sm:not-sr-only text-slate-700">Password</Label>
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
                      className="pl-10 h-9 sm:h-11 bg-white border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Link to="/forgot-password" className="text-xs text-sky-600 hover:text-sky-700 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 sm:h-11 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-md shadow-sky-500/20 transition-all"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
                  ) : (
                    <>Sign in <ArrowRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="mobile" className="mt-3 sm:mt-5">
              <div className="space-y-3 sm:space-y-5">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="phone" className="sr-only sm:not-sr-only text-slate-700">Mobile number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setOtpSent(false);
                        setOtp("");
                      }}
                      placeholder="10-digit mobile number"
                      className="pl-10 h-9 sm:h-11 bg-white border-slate-200 focus-visible:ring-sky-500"
                    />
                  </div>
                </div>

                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || phone.length !== 10}
                    className="w-full h-9 sm:h-11 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white"
                  >
                    {otpSending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : "Send OTP"}
                  </Button>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-slate-700">Enter 6-digit OTP</Label>
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otp.length !== 6}
                      className="w-full h-9 sm:h-11 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white"
                    >
                      {otpVerifying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…</> : "Verify & Sign in"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(false); setOtp(""); }}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Change number
                    </button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="mt-3 sm:mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </div>
          )}

          {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reason") === "demo" && (
            <div className="mt-3 sm:mt-5 rounded-lg sm:rounded-xl border border-amber-200 bg-amber-50 px-3 sm:px-4 py-2 sm:py-3 text-xs text-amber-800">
              <span className="font-semibold">Sign in to try the demo.</span>{" "}
              <span className="hidden min-[380px]:inline">Verify your mobile with OTP below and you'll be taken straight to the demo dashboard.</span>
            </div>
          )}

          {/* Account help */}
          <div className="mt-4 sm:mt-6 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
              <div className="text-xs sm:text-xs text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">New here?</span> Student accounts are created automatically after course purchase.{" "}
                <a href="https://mbacompass.in/courses" className="text-sky-600 font-medium hover:underline">Browse courses →</a>
              </div>
            </div>
          </div>

          {/* Demo — subtle secondary link */}
          <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5 text-xs sm:text-xs text-slate-500">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Just exploring?</span>
            <button
              type="button"
              onClick={handleDemoGoogle}
              disabled={googleLoading}
              className="text-sky-600 hover:text-sky-700 hover:underline font-medium disabled:opacity-60"
            >
              Google demo
            </button>
            <span className="text-slate-300">·</span>
            <Link
              to="/auth?mode=signup&redirect=/demo&reason=demo"
              className="text-sky-600 hover:text-sky-700 hover:underline font-medium"
            >
              Mobile demo
            </Link>
          </div>

          <p className="mt-4 sm:mt-6 lg:mt-8 text-center text-xs sm:text-xs text-slate-400">
            Protected by industry-standard encryption · MBA Compass © {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* RIGHT — Premium visual */}
      <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-sky-900">
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
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur grid place-items-center border border-white/20">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-wide text-white/80">MBA Compass · Student LMS</span>
          </div>

          <div className="space-y-8">
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
              <FeatureChip icon={<Sparkles className="h-4 w-4" />} title="Personalized Hub" desc="AI-curated mocks across CAT, NMAT, XAT, SNAP & more" />
              <FeatureChip icon={<CalendarCheck className="h-4 w-4" />} title="Daily Planner" desc="Smart schedule with streaks & XP rewards" />
              <FeatureChip icon={<BookOpenCheck className="h-4 w-4" />} title="Mock Tests" desc="Full-length, sectional & topic-wise practice" />
              <FeatureChip icon={<BarChart3 className="h-4 w-4" />} title="Performance Analytics" desc="Deep insights, percentile & weak-area heatmaps" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50">
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

function FeatureChip({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-sky-400/30 to-blue-500/30 border border-white/10 grid place-items-center text-sky-200 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="text-sm font-semibold text-white">{title}</div>
      </div>
      <div className="text-xs text-white/60 leading-snug">{desc}</div>
    </div>
  );
}
