import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Phone, AlertCircle, ShieldCheck, Loader2, ArrowRight, Lock } from "lucide-react";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
  userEmail?: string | null;
}

/**
 * Minimal post-Google onboarding: only verify mobile via OTP, then mark complete.
 * No exam or experience questions.
 */
const OnboardingDialog = ({ open, onComplete, userId, userEmail }: OnboardingDialogProps) => {
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validatePhone = (value: string) => {
    const d = value.replace(/\D/g, "");
    if (d.length === 0) return "Mobile number is required";
    if (d.length !== 10) return "Enter a valid 10-digit mobile number";
    if (!/^[6-9]/.test(d)) return "Enter a valid Indian mobile number";
    return "";
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    setPhoneVerified(false);
    setOtpStep(false);
    setOtpValue("");
    if (phoneTouched) setPhoneError(validatePhone(digits));
  };

  const finalize = async () => {
    setLoading(true);
    // Set the password on the Google-authenticated user so they can also log in
    // with email/password and mobile/password later.
    if (password.length >= 6) {
      try {
        await supabase.auth.updateUser({ password });
      } catch { /* non-fatal */ }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        phone,
        onboarding_completed: true,
      } as any)
      .eq("user_id", userId);
    setLoading(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "You're all set!" });
    onComplete();
  };

  const isAdminEmail = (userEmail || "").toLowerCase() === "admin@admin.com";

  const handleSendOtp = async () => {
    const err = validatePhone(phone);
    if (err) { setPhoneError(err); setPhoneTouched(true); return; }

    // Admin bypass: skip password + OTP entirely for admin@admin.com
    if (isAdminEmail) {
      setOtpSending(true);
      try {
        setPhoneVerified(true);
        setOtpStep(false);
        await finalize();
      } finally {
        setOtpSending(false);
      }
      return;
    }

    if (password.length < 6) {
      toast({ title: "Create a password", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }

    setOtpSending(true);
    try {
      const [adminRes, dupRes, otpRes] = await Promise.all([
        userEmail
          ? Promise.resolve(supabase.rpc("is_admin_email", { _email: userEmail })).catch(() => ({ data: false } as any))
          : Promise.resolve({ data: false } as any),
        supabase.functions.invoke("check-duplicate", { body: { phone } }).catch(() => ({ data: null } as any)),
        supabase.functions.invoke("send-otp", { body: { phone } }),
      ]);

      if (adminRes?.data) {
        setPhoneVerified(true);
        setOtpStep(false);
        await finalize();
        return;
      }

      if (dupRes?.data?.phoneExists) {
        toast({ title: "Number already in use", description: "This mobile is registered to another account.", variant: "destructive" });
        return;
      }

      if (otpRes.error) throw new Error(otpRes.error.message);
      if (otpRes.data?.error) throw new Error(otpRes.data.error);
      toast({ title: "OTP sent", description: `6-digit code sent to +91 ${phone}.` });
      setOtpStep(true);
      setResendTimer(30);
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, otp: otpValue } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.verified) {
        setPhoneVerified(true);
        setOtpStep(false);
        await finalize();
      }
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verify your mobile number
          </DialogTitle>
          <DialogDescription>
            Verify your mobile and create a password to finish setting up your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              Mobile Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">+91</span>
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => { setPhoneTouched(true); setPhoneError(validatePhone(phone)); }}
                placeholder="Enter 10-digit mobile number"
                className={`pl-12 h-11 ${phoneTouched && phoneError ? "border-destructive" : ""} ${phoneVerified ? "border-emerald-500" : ""}`}
                maxLength={10}
                disabled={phoneVerified || otpStep}
              />
            </div>
            {phoneTouched && phoneError && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {phoneError}
              </p>
            )}
          </div>

          {!otpStep && !phoneVerified && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                Create Password <span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11"
                minLength={6}
                autoComplete="new-password"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Use this to log in later with your email or mobile.
              </p>
            </div>
          )}

          {!otpStep && !phoneVerified && (
            <Button onClick={handleSendOtp} className="w-full h-11" disabled={otpSending || phone.length !== 10 || password.length < 6}>
              {otpSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP…</> : <>Send OTP <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          )}

          {otpStep && !phoneVerified && (
            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/40">
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit OTP sent to <span className="font-medium text-foreground">+91 {phone}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerifyOtp} className="w-full h-11"
                disabled={otpVerifying || loading || otpValue.length !== 6}>
                {otpVerifying || loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Finishing…</> : <>Verify & Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button type="button" className="text-muted-foreground hover:text-foreground"
                  onClick={() => { setOtpStep(false); setOtpValue(""); setResendTimer(0); }}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
