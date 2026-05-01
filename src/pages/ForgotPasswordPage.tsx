import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mbahubLogo from "@/assets/brandLogo";

/**
 * Universal password reset — works for users who signed up with:
 *   • Email + password
 *   • Mobile + OTP (no email known to user)
 *   • Google OAuth (no password set yet — this flow lets them set one)
 *
 * Single identifier: just the registered 10-digit mobile number. We look up the
 * email server-side, send an OTP, auto-verify when 6 digits are entered, then
 * let the user set/replace their password.
 */
const ForgotPasswordPage = () => {
  const [step, setStep] = useState<"request" | "otp" | "reset">("request");
  const [phone, setPhone] = useState("");
  const [resolvedEmail, setResolvedEmail] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const autoVerifiedRef = useRef(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) {
      toast({ title: "Invalid mobile", description: "Enter your registered 10-digit mobile.", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    autoVerifiedRef.current = false;
    setOtpValue("");
    try {
      // Look up the linked email and send OTP in parallel.
      const [lookup, otpRes] = await Promise.all([
        supabase.functions.invoke("lookup-email-by-phone", { body: { phone } }),
        supabase.functions.invoke("send-otp", { body: { phone } }),
      ]);
      if (lookup.error) throw new Error(lookup.error.message);
      const linkedEmail: string | null = (lookup.data as any)?.email || null;
      if (!linkedEmail) {
        throw new Error("No account found for this mobile number.");
      }
      setResolvedEmail(linkedEmail);

      if (otpRes.error) throw new Error(otpRes.error.message);
      if ((otpRes.data as any)?.error) throw new Error((otpRes.data as any).error);

      toast({ title: "OTP sent", description: `A 6-digit code was sent to +91 ${phone}.` });
      setStep("otp");
      setResendTimer(30);
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const code = (codeOverride ?? otpValue).trim();
    if (code.length !== 6 || otpVerifying) return;
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, otp: code },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      if ((data as any)?.verified) {
        setStep("reset");
        toast({ title: "Identity verified", description: "Now set your new password." });
      } else {
        throw new Error("OTP verification failed");
      }
    } catch (err: any) {
      autoVerifiedRef.current = false;
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  // Auto-verify when user finishes typing 6 digits
  useEffect(() => {
    if (step !== "otp") return;
    if (otpValue.length === 6 && !autoVerifiedRef.current && !otpVerifying) {
      autoVerifiedRef.current = true;
      void handleVerifyOtp(otpValue);
    }
    if (otpValue.length < 6) autoVerifiedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue, step]);

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password-otp", {
        body: { email: resolvedEmail, phone, newPassword },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Password updated", description: "Sign in with your new password." });
      navigate("/auth");
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={mbahubLogo} alt="MBA Compass Logo" className="mx-auto w-16 h-16 rounded-xl object-contain mb-4" />
          <CardTitle className="font-heading text-2xl">Reset your password</CardTitle>
          <CardDescription>
            {step === "request" && "Works for email, mobile-OTP, and Google sign-ups. Enter your registered mobile to begin."}
            {step === "otp" && "Enter the 6-digit OTP — we'll verify it automatically."}
            {step === "reset" && "Set a new password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "request" && (
            <>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">+91</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Registered 10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-[4.25rem] h-11"
                  maxLength={10}
                  required
                />
              </div>
              <Button className="w-full h-11" onClick={handleSendOtp} disabled={otpSending || phone.length !== 10}>
                {otpSending ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP…</>) : "Send OTP"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Signed up with Google? Use the same mobile you provided during onboarding to set a password.
              </p>
            </>
          )}

          {step === "otp" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Enter the OTP sent to <span className="font-medium text-foreground">+91 {phone}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue} autoFocus>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full h-11" onClick={() => handleVerifyOtp()} disabled={otpVerifying || otpValue.length !== 6}>
                {otpVerifying ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>) : "Verify OTP"}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" className="text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep("request"); setOtpValue(""); setResendTimer(0); }}>
                  ← Change number
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

          {step === "reset" && (
            <div className="space-y-4">
              <div className="flex justify-center mb-2">
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-sm text-center text-muted-foreground">Identity verified. Set your new password.</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-11"
                  autoComplete="new-password"
                />
              </div>
              <Button className="w-full h-11" onClick={handleResetPassword} disabled={resetting}>
                {resetting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>) : "Update password"}
              </Button>
            </div>
          )}

          {step !== "reset" && (
            <div className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <button onClick={() => navigate("/auth")} className="text-primary font-medium hover:underline">
                Sign in
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
