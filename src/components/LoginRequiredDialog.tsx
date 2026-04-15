import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail, User, Phone, ShieldCheck } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectUri, getCurrentRelativeUrl, storePostAuthRedirect } from "@/lib/authRedirect";

interface LoginRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

const LoginRequiredDialog = ({ open, onOpenChange, message }: LoginRequiredDialogProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  // OTP states
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

  const handleSendOtp = async () => {
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
      setOtpStep(true);
      setResendTimer(30);
    } catch (err: any) {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the complete 6-digit OTP.", variant: "destructive" });
      return;
    }
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, otp: otpValue },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.verified) {
        setPhoneVerified(true);
        setOtpStep(false);
        toast({ title: "Phone Verified! ✅", description: "Your phone number has been verified." });
      }
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && !phoneVerified) {
      toast({ title: "Phone not verified", description: "Please verify your phone number first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        toast({ title: "Welcome back!", description: "You've been signed in successfully." });
        onOpenChange(false);
      } else {
        // Check for duplicate phone/email before signup
        const { data: dupCheck } = await supabase.functions.invoke("check-duplicate", {
          body: { phone, email },
        });
        if (dupCheck?.phoneExists) {
          toast({ title: "Already Registered", description: "This mobile number is already registered. Please sign in instead.", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (dupCheck?.emailExists) {
          toast({ title: "Already Registered", description: "This email is already registered. Please sign in instead.", variant: "destructive" });
          setLoading(false);
          return;
        }

        await signUp(email, password, displayName, phone);
        toast({ title: "Account created!", description: "Please check your email to verify your account." });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      storePostAuthRedirect(getCurrentRelativeUrl());
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: getAuthRedirectUri(),
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setOtpStep(false);
    setOtpValue("");
    setPhoneVerified(false);
    setResendTimer(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {isLogin ? "Sign In to Continue" : "Create Your Account"}
          </DialogTitle>
          <DialogDescription>
            {message || "Please sign in or create an account to access this content."}
          </DialogDescription>
        </DialogHeader>

        <Button
          variant="outline"
          className="w-full font-medium"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">or</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-10" required={!isLogin} />
              </div>

              {/* Phone + OTP Section */}
              <div className="space-y-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone Number *"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setPhoneVerified(false);
                      setOtpStep(false);
                      setOtpValue("");
                    }}
                    className="pl-10 pr-24"
                    required={!isLogin}
                    minLength={10}
                    maxLength={10}
                    disabled={phoneVerified}
                  />
                  {phoneVerified ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-4 h-4" /> Verified
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
                      onClick={handleSendOtp}
                      disabled={otpSending || phone.length !== 10 || resendTimer > 0}
                    >
                      {otpSending ? "Sending..." : resendTimer > 0 ? `Resend (${resendTimer}s)` : otpStep ? "Resend OTP" : "Send OTP"}
                    </Button>
                  )}
                </div>

                {otpStep && !phoneVerified && (
                  <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                    <p className="text-xs text-muted-foreground">
                      Enter the 6-digit OTP sent to <span className="font-medium text-foreground">{phone}</span>
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
                      type="button"
                      className="w-full"
                      size="sm"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otpValue.length !== 6}
                    >
                      {otpVerifying ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                )}
              </div>

              <Select value={targetYear} onValueChange={setTargetYear} required>
                <SelectTrigger>
                  <SelectValue placeholder="CAT Target Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">CAT 2026</SelectItem>
                  <SelectItem value="2027">CAT 2027</SelectItem>
                  <SelectItem value="2028">CAT 2028</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || (!isLogin && !phoneVerified)}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </Button>
          {isLogin && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline" onClick={() => onOpenChange(false)}>
                Forgot Password?
              </Link>
            </div>
          )}
        </form>
        <div className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={handleToggleMode} className="text-primary font-medium hover:underline">
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginRequiredDialog;
