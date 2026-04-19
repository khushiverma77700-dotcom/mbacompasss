import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Briefcase, Phone, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

const EXAMS = ["CAT", "NMAT", "XAT", "SNAP", "GMAT", "MAT", "CMAT", "IIFT"];
const EXPERIENCE_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

const TEMP_DISABLE_PHONE_OTP = false;

const OnboardingDialog = ({ open, onComplete, userId }: OnboardingDialogProps) => {
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [workExperience, setWorkExperience] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // OTP states
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const allSelected = selectedExams.length === EXAMS.length;

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "Mobile number is required";
    if (digits.length < 10) return "Enter a valid 10-digit mobile number";
    if (digits.length > 10) return "Mobile number must be exactly 10 digits";
    if (!/^[6-9]/.test(digits)) return "Enter a valid Indian mobile number";
    return "";
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    setPhoneVerified(false);
    setOtpStep(false);
    setOtpValue("");
    if (phoneTouched) {
      setPhoneError(validatePhone(digits));
    }
  };

  const handleSendOtp = async () => {
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      setPhoneTouched(true);
      return;
    }

    // Block duplicate phone before sending OTP
    try {
      const { data: dupCheck } = await supabase.functions.invoke("check-duplicate", {
        body: { phone },
      });
      if (dupCheck?.phoneExists) {
        toast({ title: "You already have an account", description: "This mobile number is already registered. Please log in instead.", variant: "destructive" });
        return;
      }
    } catch {
      /* non-fatal */
    }

    if (TEMP_DISABLE_PHONE_OTP) {
      setPhoneTouched(true);
      setPhoneError("");
      setPhoneVerified(true);
      setOtpStep(false);
      setOtpValue("");
      setResendTimer(0);
      toast({ title: "Phone accepted", description: "OTP verification is temporarily disabled. You can continue." });
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
        setOtpStep(false);
        toast({ title: "Phone Verified! ✅", description: "Your phone number has been verified." });
      }
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setOtpVerifying(false);
    }
  };

  const toggleExam = (exam: string) => {
    setSelectedExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const toggleAll = () => {
    setSelectedExams(allSelected ? [] : [...EXAMS]);
  };

  const isPhoneAccepted = TEMP_DISABLE_PHONE_OTP ? !validatePhone(phone) : phoneVerified;

  const handleSubmit = async () => {
    setPhoneTouched(true);
    const phoneErr = validatePhone(phone);
    setPhoneError(phoneErr);

    if (!isPhoneAccepted) {
      toast({ title: "Invalid phone", description: "Please enter a valid mobile number.", variant: "destructive" });
      return;
    }
    if (selectedExams.length === 0) {
      toast({ title: "Please select at least one exam", variant: "destructive" });
      return;
    }
    if (!workExperience) {
      toast({ title: "Please select your work experience", variant: "destructive" });
      return;
    }

    setLoading(true);

    const signupPageName = document.title || "Unknown";
    const signupPageUrl = window.location.pathname;

    const { error } = await supabase
      .from("profiles")
      .update({
        phone: phone,
        target_exams: selectedExams,
        work_experience: workExperience,
        signup_page_name: signupPageName,
        signup_page_url: signupPageUrl,
        onboarding_completed: true,
      } as any)
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error saving preferences", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preferences saved!", description: "Your profile has been updated." });
      onComplete();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Tell us about yourself
          </DialogTitle>
          <DialogDescription>
            Help us personalize your experience by answering a few quick questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Phone Number with OTP */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Phone className="w-4 h-4" />
              Mobile Number <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                +91
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => {
                  setPhoneTouched(true);
                  setPhoneError(validatePhone(phone));
                }}
                placeholder="Enter 10-digit mobile number"
                className={`pl-12 pr-24 ${phoneTouched && phoneError ? "border-destructive focus-visible:ring-destructive" : ""} ${phoneVerified ? "border-emerald-500 focus-visible:ring-emerald-500" : ""}`}
                maxLength={10}
                disabled={phoneVerified}
              />
              {phoneVerified ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium flex items-center gap-1 text-emerald-600">
                  <ShieldCheck className="w-4 h-4" /> Accepted
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={handleSendOtp}
                  disabled={phone.length !== 10}
                >
                  Continue
                </Button>
              )}
            </div>
            {phoneTouched && phoneError && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {phoneError}
              </p>
            )}
            {TEMP_DISABLE_PHONE_OTP && (
              <p className="text-xs text-muted-foreground mt-2">OTP verification is temporarily disabled.</p>
            )}
          </div>

          {/* Exam Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Which exams are you targeting? <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                <span className="text-sm font-medium">Select All</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EXAMS.map((exam) => (
                  <label
                    key={exam}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedExams.includes(exam)}
                      onCheckedChange={() => toggleExam(exam)}
                    />
                    <span className="text-sm">{exam}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Work Experience (in years) <span className="text-destructive">*</span>
            </label>
            <Select value={workExperience} onValueChange={setWorkExperience}>
              <SelectTrigger>
                <SelectValue placeholder="Select years of experience" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((yr) => (
                  <SelectItem key={yr} value={yr}>
                    {yr === "0" ? "Fresher (0 years)" : yr === "10+" ? "10+ years" : `${yr} year${parseInt(yr) > 1 ? "s" : ""}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={loading || !isPhoneAccepted}>
            {loading ? "Saving..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
