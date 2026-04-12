import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mbahubLogo from "@/assets/mbahub-logo.png";

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<"request" | "otp" | "reset">("request");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // OTP states
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Reset states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      toast({ title: "Invalid Phone", description: "Enter a valid 10-digit phone number.", variant: "destructive" });
      return;
    }

    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "OTP Sent!", description: `A 6-digit OTP has been sent to ${phone}.` });
      setStep("otp");
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
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, otp: otpValue },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.verified) {
        setPhoneVerified(true);
        toast({ title: "Phone Verified! ✅" });
        // Now send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setStep("reset");
        toast({ title: "Reset link sent!", description: "Check your email for the password reset link." });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={mbahubLogo} alt="MBAHub Logo" className="mx-auto w-16 h-16 rounded-xl object-contain mb-4" />
          <CardTitle className="font-heading text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {step === "request" && "Enter your email and phone number to verify your identity."}
            {step === "otp" && "Enter the 6-digit OTP sent to your phone."}
            {step === "reset" && "A password reset link has been sent to your email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "request" && (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Registered Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-10"
                  required
                  minLength={10}
                  maxLength={10}
                />
              </div>
              <Button className="w-full" onClick={handleSendOtp} disabled={otpSending}>
                {otpSending ? "Sending OTP..." : "Send OTP & Verify"}
              </Button>
            </>
          )}

          {step === "otp" && !phoneVerified && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Enter the OTP sent to <span className="font-medium text-foreground">{phone}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={otpVerifying || otpValue.length !== 6}
              >
                {otpVerifying ? "Verifying..." : "Verify OTP"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                  disabled={resendTimer > 0}
                  onClick={handleSendOtp}
                >
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          {step === "reset" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <ShieldCheck className="w-12 h-12 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>. 
                Click the link in your email to set a new password.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                Back to Sign In
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
