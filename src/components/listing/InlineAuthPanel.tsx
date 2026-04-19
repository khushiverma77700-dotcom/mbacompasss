import { useState } from "react";
import { z } from "zod";
import { Loader2, Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";

const signupSchema = z.object({
  display_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().regex(/^\d{10}$/, "Enter 10-digit mobile"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const signinSchema = z.object({
  email: z.string().trim().email("Valid email required").max(255),
  password: z.string().min(1, "Password required").max(72),
});

interface InlineAuthPanelProps {
  /** Where to send the user back after Google OAuth completes */
  returnTo: string;
  /** Heading text shown above the panel */
  title?: string;
  subtitle?: string;
}

const InlineAuthPanel = ({
  returnTo,
  title = "Sign in to continue",
  subtitle = "Create an account or sign in — your listing will be linked to this account so you can manage it anytime.",
}: InlineAuthPanelProps) => {
  const { signUp, signIn } = useAuth();
  const [tab, setTab] = useState<"signup" | "signin">("signup");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [signupForm, setSignupForm] = useState({ display_name: "", email: "", phone: "", password: "" });
  const [signinForm, setSigninForm] = useState({ email: "", password: "" });

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      // Persist target so AuthContext / app can route back; lovable redirect_uri sends to origin.
      sessionStorage.setItem("postAuthRedirect", returnTo);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + returnTo,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return; // browser navigates away
      // tokens already set
      toast.success("Signed in with Google");
    } catch (e: any) {
      toast.error(e?.message || "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(signupForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await signUp(parsed.data.email, parsed.data.password, parsed.data.display_name, parsed.data.phone);
      toast.success("Account created! Check your inbox to verify your email, then continue.");
      // Try auto sign-in (works if email confirmation is disabled)
      try {
        await signIn(parsed.data.email, parsed.data.password);
      } catch {
        // confirmation required — user will sign in after verifying
      }
    } catch (e: any) {
      const msg = e?.message || "Signup failed";
      if (msg.toLowerCase().includes("already")) {
        toast.error("Email already registered. Please sign in instead.");
        setTab("signin");
        setSigninForm((f) => ({ ...f, email: parsed.data.email }));
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
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
      await signIn(parsed.data.email, parsed.data.password);
      toast.success("Signed in");
    } catch (e: any) {
      toast.error(e?.message || "Invalid email or password");
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
          <span className="bg-card px-2 text-muted-foreground">Or with email</span>
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
                  className="pl-9"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="9876543210"
                  maxLength={10}
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
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create account & continue
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signin">
          <form onSubmit={handleSignin} className="space-y-4">
            <div>
              <Label>Email *</Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  className="pl-9"
                  value={signinForm.email}
                  onChange={(e) => setSigninForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@institute.com"
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
                  value={signinForm.password}
                  onChange={(e) => setSigninForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Your password"
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
