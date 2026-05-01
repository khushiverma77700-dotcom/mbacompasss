import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, User, ShieldCheck, ArrowRight, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUri, normalizeRedirectPath, storePostAuthRedirect } from "@/lib/authRedirect";
import mbahubLogo from "@/assets/brandLogo";

/**
 * Frictionless auth:
 *  Sign Up:
 *    1) Continue with Google  → OnboardingDialog asks mobile OTP + password.
 *    2) Sign up with mobile   → first/last name + email + mobile + OTP + password.
 *  Sign In:
 *    - Google (one click)
 *    - Email OR 10-digit mobile + password (auto-detected).
 */
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  // Login: identifier can be email OR 10-digit phone.
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // OTP
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const autoVerifiedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const redirectTo = (location.state as any)?.from || "/";

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const resetMode = () => {
    setIsLogin(!isLogin);
    setOtpStep(false);
    setOtpValue("");
    setPhoneVerified(false);
    setResendTimer(0);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      storePostAuthRedirect(normalizeRedirectPath(redirectTo));
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getAuthRedirectUri(),
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Google sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  // ---------- Login (email OR phone + password) ----------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const id = loginId.trim();
      let emailToUse = id;

      // If it's a 10-digit phone, look up the linked email.
      if (/^\d{10}$/.test(id)) {
        const { data, error } = await supabase.functions.invoke("lookup-email-by-phone", {
          body: { phone: id },
        });
        if (error) throw new Error(error.message);
        if (!data?.email) throw new Error("No account found for this mobile number.");
        emailToUse = data.email;
      }

      await signIn(emailToUse, loginPassword);
      toast({ title: "Welcome back!" });
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ---------- Signup ----------
  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }
    if (signupPassword.length < 6) {
      toast({ title: "Weak password", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }

    setOtpSending(true);
    autoVerifiedRef.current = false;
    setOtpValue("");

    try {
      // Run duplicate check + send OTP in parallel to halve latency.
      const [dupRes, otpRes] = await Promise.all([
        supabase.functions.invoke("check-duplicate", { body: { phone, email } })
          .catch(() => ({ data: null, error: null } as any)),
        supabase.functions.invoke("send-otp", { body: { phone } }),
      ]);

      const dup: any = dupRes?.data;
      if (dup?.phoneExists) {
        toast({ title: "Account exists", description: "This mobile is already registered. Please sign in.", variant: "destructive" });
        setIsLogin(true);
        return;
      }
      if (dup?.emailExists) {
        toast({ title: "Account exists", description: "This email is already registered. Please sign in.", variant: "destructive" });
        setIsLogin(true);
        return;
      }

      if (otpRes.error) throw new Error(otpRes.error.message);
      if ((otpRes.data as any)?.error) throw new Error((otpRes.data as any).error);

      toast({ title: "OTP sent", description: `We sent a 6-digit code to +91 ${phone}.` });
      setOtpStep(true);
      setResendTimer(30);
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyAndCreate = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpValue).trim();
    if (code.length !== 6) {
      toast({ title: "Enter the 6-digit OTP", variant: "destructive" });
      return;
    }
    if (otpVerifying) return;
    setOtpVerifying(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const signupPageUrl = window.location.pathname;
      const signupPageName = document.title || "Unknown";

      // Verify OTP and create the account in parallel for lower perceived latency.
      const verifyP = supabase.functions.invoke("verify-otp", { body: { phone, otp: code } });
      const signUpP = supabase.auth.signUp({
        email: email.trim(),
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: displayName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone,
            signup_page_url: signupPageUrl,
            signup_page_name: signupPageName,
          },
        },
      });

      const [{ data: verifyData, error: verifyErr }, { error: signUpErr }] =
        await Promise.all([verifyP, signUpP]);

      if (verifyErr) throw new Error(verifyErr.message);
      if ((verifyData as any)?.error) throw new Error((verifyData as any).error);
      if (!(verifyData as any)?.verified) throw new Error("OTP verification failed");
      if (signUpErr) throw signUpErr;

      setPhoneVerified(true);
      // Profile is created by the handle_new_user trigger and signUp returns a
      // session (auto-confirm is on), so we skip extra getUser / profile-update /
      // signInWithPassword round-trips that previously cost ~1.5s.

      toast({ title: "Welcome to MBA Compass!", description: "Your account is ready." });
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      autoVerifiedRef.current = false; // allow retry
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  // Auto-verify when the user finishes entering 6 digits.
  useEffect(() => {
    if (!otpStep || phoneVerified) return;
    if (otpValue.length === 6 && !autoVerifiedRef.current && !otpVerifying) {
      autoVerifiedRef.current = true;
      void handleVerifyAndCreate(otpValue);
    }
    if (otpValue.length < 6) {
      autoVerifiedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue, otpStep, phoneVerified]);


  const canSendOtp =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email) &&
    /^\d{10}$/.test(phone) &&
    signupPassword.length >= 6;

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={mbahubLogo} alt="MBA Compass Logo" className="mx-auto w-14 h-14 rounded-xl object-contain mb-3" />
          <CardTitle className="font-heading text-2xl">
            {isLogin ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in with email or mobile number." : "It only takes a few seconds."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google — primary */}
          <Button
            variant="outline"
            className="w-full h-11 font-medium"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Redirecting…" : isLogin ? "Continue with Google" : "Sign up with Google"}
          </Button>

          <div className="relative py-1">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or {isLogin ? "use email or mobile" : "sign up with mobile"}
            </span>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Email or 10-digit mobile"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="pl-10 h-11"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in…</> : <>Sign in <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {!otpStep && !phoneVerified && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="First name" value={firstName}
                        onChange={(e) => setFirstName(e.target.value)} className="pl-10 h-11" required />
                    </div>
                    <Input placeholder="Last name" value={lastName}
                      onChange={(e) => setLastName(e.target.value)} className="h-11" required />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="Email address" value={email}
                      onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">+91</span>
                    <Input type="tel" inputMode="numeric" placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="pl-[4.25rem] h-11" maxLength={10} required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Create password (min 6 characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 h-11"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                  <Button onClick={handleSendOtp} className="w-full h-11" disabled={!canSendOtp || otpSending}>
                    {otpSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP…</> : <>Send OTP <ArrowRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">
                    The same password works with both email and mobile login.
                  </p>
                </>
              )}

              {otpStep && !phoneVerified && (
                <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/40">
                  <p className="text-sm text-foreground font-medium text-center">Verify your mobile number</p>
                  <p className="text-xs text-muted-foreground text-center">
                    We sent a 6-digit OTP to <span className="font-medium text-foreground">+91 {phone}</span>
                  </p>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button onClick={handleVerifyAndCreate} className="w-full h-11"
                    disabled={otpVerifying || otpValue.length !== 6}>
                    {otpVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</> : <>Verify & Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                  <div className="flex items-center justify-between text-xs">
                    <button type="button" className="text-muted-foreground hover:text-foreground"
                      onClick={() => { setOtpStep(false); setOtpValue(""); setResendTimer(0); }}>
                      ← Edit details
                    </button>
                    <button
                      type="button"
                      className="text-primary hover:underline disabled:opacity-50"
                      disabled={resendTimer > 0 || otpSending}
                      onClick={handleSendOtp}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground pt-1">
            {isLogin ? "New to MBA Compass?" : "Already have an account?"}{" "}
            <button onClick={resetMode} className="text-primary font-medium hover:underline">
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="pt-3 mt-1 border-t border-border space-y-2 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Secure sign-in by <span className="font-semibold text-foreground">MBA Compass</span>
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <Link to="/page/privacy-policy" className="hover:text-primary hover:underline">Privacy</Link>
              <span>•</span>
              <Link to="/page/terms-and-conditions" className="hover:text-primary hover:underline">Terms</Link>
              <span>•</span>
              <Link to="/contact" className="hover:text-primary hover:underline">Contact</Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
