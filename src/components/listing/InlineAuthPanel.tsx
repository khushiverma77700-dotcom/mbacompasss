import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, User as UserIcon, Phone, Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

/**
 * Institute-only auth panel.
 * - No OTP anywhere.
 * - Signup captures: Name, Email, Mobile, Designation, Password.
 * - Login uses a single smart field that accepts email OR 10-digit mobile.
 * - After signup, auto sign-in so the user lands directly on the next step / dashboard.
 */

const signupSchema = z.object({
  display_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().regex(/^\d{10}$/, "Enter 10-digit mobile"),
  designation: z.string().trim().min(2, "Designation required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const signinSchema = z.object({
  identifier: z.string().trim().min(1, "Email or mobile required"),
  password: z.string().min(1, "Password required").max(72),
});

interface InlineAuthPanelProps {
  /** Where to send the user back after Google OAuth completes */
  returnTo: string;
  /** Heading text shown above the panel */
  title?: string;
  subtitle?: string;
  /** Default fields the parent already collected (e.g. from POC form) */
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
  defaultDesignation?: string;
}

const InlineAuthPanel = ({
  returnTo,
  title = "Create your institute account",
  subtitle = "Your account becomes the owner of this listing — sign back in anytime to manage it.",
  defaultName = "",
  defaultEmail = "",
  defaultPhone = "",
  defaultDesignation = "",
}: InlineAuthPanelProps) => {
  const { signUp, signIn } = useAuth();
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [signupForm, setSignupForm] = useState({
    display_name: defaultName,
    email: defaultEmail,
    phone: defaultPhone,
    designation: defaultDesignation,
    password: "",
  });
  const [signinForm, setSigninForm] = useState({ identifier: "", password: "" });

  // OTP state for signup mobile verification
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      sessionStorage.setItem("postAuthRedirect", returnTo);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + returnTo,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in with Google");
    } catch (e: any) {
      toast.error(e?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const switchToLoginWith = (identifier: string) => {
    setTab("signin");
    setSigninForm({ identifier, password: "" });
    toast.error("You already have an account. Please log in.");
  };

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(signupForm.phone)) {
      toast.error("Enter a valid 10-digit mobile number first.");
      return;
    }
    // Pre-check duplicate phone before sending OTP
    try {
      const { data: dup } = await supabase.functions.invoke("check-duplicate", {
        body: { phone: signupForm.phone },
      });
      if (dup?.phoneExists) {
        switchToLoginWith(signupForm.phone);
        return;
      }
    } catch {
      /* non-fatal */
    }

    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone: signupForm.phone },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(`OTP sent to ${signupForm.phone}`);
      setOtpStep(true);
      setResendTimer(30);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: signupForm.phone, otp: otpValue },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.verified) {
        setPhoneVerified(true);
        setOtpStep(false);
        toast.success("Mobile verified");
      }
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(signupForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!phoneVerified) {
      toast.error("Please verify your mobile number with OTP first.");
      return;
    }
    setLoading(true);
    try {
      // Duplicate guard
      try {
        const { data: dup } = await supabase.functions.invoke("check-duplicate", {
          body: { email: parsed.data.email, phone: parsed.data.phone },
        });
        if (dup?.emailExists) {
          switchToLoginWith(parsed.data.email);
          setLoading(false);
          return;
        }
        if (dup?.phoneExists) {
          switchToLoginWith(parsed.data.phone);
          setLoading(false);
          return;
        }
      } catch {
        /* non-fatal */
      }

      await signUp(
        parsed.data.email,
        parsed.data.password,
        parsed.data.display_name,
        parsed.data.phone,
        parsed.data.designation
      );

      try {
        await signIn(parsed.data.email, parsed.data.password);
        toast.success("Account created. You're signed in.");
      } catch {
        toast.success("Account created. Please verify your email, then sign in.");
        setTab("signin");
        setSigninForm({ identifier: parsed.data.email, password: "" });
      }
    } catch (e: any) {
      const msg = e?.message || "Signup failed";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        switchToLoginWith(parsed.data.email);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const resolveEmailFromMobile = async (mobile: string): Promise<string | null> => {
    // Look up the email via the profile so the user can log in with mobile.
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("phone", mobile)
      .maybeSingle();
    if (!data?.user_id) return null;
    // We can't read auth.users.email from the client. Use the duplicate-check edge function
    // as a safe lookup: it returns whether an email exists, but we need the email itself.
    // Instead, ask the dedicated lookup endpoint.
    try {
      const { data: lookup } = await supabase.functions.invoke("lookup-email-by-phone", {
        body: { phone: mobile },
      });
      return lookup?.email ?? null;
    } catch {
      return null;
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signinSchema.safeParse(signinForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const id = parsed.data.identifier.trim();
      let email = id;

      // If the user typed a 10-digit mobile, resolve it to email.
      if (/^\d{10}$/.test(id)) {
        const resolved = await resolveEmailFromMobile(id);
        if (!resolved) {
          toast.error("No account found for this mobile number.");
          setLoading(false);
          return;
        }
        email = resolved;
      }

      await signIn(email, parsed.data.password);
      toast.success("Signed in");
    } catch (e: any) {
      toast.error(e?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 md:p-8 max-w-xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full mb-5 h-11"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Continue with Google
      </Button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or use email</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "signup" | "signin")} className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-5">
          <TabsTrigger value="signup">Create account</TabsTrigger>
          <TabsTrigger value="signin">Sign in</TabsTrigger>
        </TabsList>

        <TabsContent value="signup">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <div className="relative mt-1">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={signupForm.display_name}
                  onChange={(e) => setSignupForm((f) => ({ ...f, display_name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-9"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@institute.com"
                />
              </div>
            </div>
            <div>
              <Label>Mobile (10-digit) *</Label>
              <div className="relative mt-1">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 pr-28"
                  value={signupForm.phone}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setSignupForm((f) => ({ ...f, phone: v }));
                    setPhoneVerified(false);
                    setOtpStep(false);
                    setOtpValue("");
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  disabled={phoneVerified}
                />
                {phoneVerified ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Verified
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
                    onClick={handleSendOtp}
                    disabled={signupForm.phone.length !== 10 || otpSending}
                  >
                    {otpSending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Send OTP"}
                  </Button>
                )}
              </div>
              {otpStep && !phoneVerified && (
                <div className="mt-3 space-y-2 p-3 rounded-md border border-border bg-muted/40">
                  <p className="text-xs text-muted-foreground">Enter the 6-digit OTP sent to +91 {signupForm.phone}</p>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                      disabled={resendTimer > 0 || otpSending}
                      onClick={handleSendOtp}
                    >
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                    </button>
                    <Button type="button" size="sm" onClick={handleVerifyOtp} disabled={otpVerifying || otpValue.length !== 6}>
                      {otpVerifying && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      Verify
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label>Designation *</Label>
              <div className="relative mt-1">
                <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={signupForm.designation}
                  onChange={(e) => setSignupForm((f) => ({ ...f, designation: e.target.value }))}
                  placeholder="e.g. Director, Marketing Head"
                />
              </div>
            </div>
            <div>
              <Label>Password *</Label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-9"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading || !phoneVerified}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {phoneVerified ? "Create account & continue" : "Verify mobile to continue"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signin">
          <form onSubmit={handleSignin} className="space-y-4">
            <div>
              <Label>Email or Mobile *</Label>
              <div className="relative mt-1">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={signinForm.identifier}
                  onChange={(e) => setSigninForm((f) => ({ ...f, identifier: e.target.value }))}
                  placeholder="you@institute.com or 9876543210"
                  autoComplete="username"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Use the email or 10-digit mobile you signed up with.</p>
            </div>
            <div>
              <Label>Password *</Label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-9"
                  value={signinForm.password}
                  onChange={(e) => setSigninForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Sign in & continue
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default InlineAuthPanel;
