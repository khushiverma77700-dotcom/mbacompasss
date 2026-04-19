import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2, ShieldCheck, ArrowRight, Building2, GraduationCap, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import StateCitySelect from "@/components/admin/StateCitySelect";
import InlineAuthPanel from "@/components/listing/InlineAuthPanel";

const GENERIC_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com", "icloud.com", "live.com", "aol.com"];

const pocSchema = z.object({
  full_name: z.string().trim().min(2, "Name required").max(100),
  designation: z.string().trim().min(2, "Designation required").max(100),
  organization: z.string().trim().min(2, "Organization required").max(200),
  website: z.string().trim().url("Valid website URL required").max(255),
  email: z.string().trim().email("Valid email required").max(255),
  mobile: z.string().regex(/^\d{10}$/, "10-digit mobile required"),
  whatsapp: z.string().regex(/^\d{10}$/, "10-digit WhatsApp required"),
  state: z.string().min(1, "State required"),
  city: z.string().min(1, "City required"),
});

const TYPE_META: Record<string, { label: string; icon: any }> = {
  coaching: { label: "Coaching Institute", icon: Building2 },
  college: { label: "College", icon: GraduationCap },
  request: { label: "Request a Listing", icon: FileQuestion },
};

const ListingPocPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const type = params.get("type") || "coaching";
  const meta = TYPE_META[type] ?? TYPE_META.coaching;
  const Icon = meta.icon;

  const [form, setForm] = useState({
    full_name: "",
    designation: "",
    organization: "",
    website: "",
    email: "",
    mobile: "",
    whatsapp: "",
    state: "",
    city: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      storePostAuthRedirect(`/list-your-business/poc?type=${type}`);
      navigate("/auth");
    }
  }, [loading, user, navigate, type]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (data) {
        setIsAdmin(true);
        setOtpVerified(true);
      }
    })();
  }, [user]);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error("Enter a valid 10-digit mobile number first");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: form.mobile } });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed to send OTP");
      setOtpSent(true);
      toast.success("OTP sent to your mobile");
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: form.mobile, otp },
      });
      if (error || !data?.verified) throw new Error(data?.error || "Invalid OTP");
      setOtpVerified(true);
      toast.success("Mobile verified");
    } catch (e: any) {
      toast.error(e.message || "Invalid OTP");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = pocSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!otpVerified && !isAdmin) {
      toast.error("Please verify your mobile via OTP");
      return;
    }

    setSubmitting(true);
    try {
      const emailDomain = form.email.split("@")[1]?.toLowerCase() || "";
      const isGeneric = GENERIC_DOMAINS.includes(emailDomain);

      // Save POC profile
      const { data: poc, error: pocErr } = await supabase
        .from("user_listing_pocs")
        .insert([{
          user_id: user.id,
          full_name: parsed.data.full_name,
          designation: parsed.data.designation,
          organization: parsed.data.organization,
          website: parsed.data.website,
          email: parsed.data.email,
          mobile: parsed.data.mobile,
          whatsapp: parsed.data.whatsapp,
          state: parsed.data.state,
          city: parsed.data.city,
          email_is_generic: isGeneric,
          mobile_otp_verified: true,
        }])
        .select()
        .single();
      if (pocErr) throw pocErr;

      // Create draft listing
      const { data: listing, error: listErr } = await supabase
        .from("user_listings")
        .insert([{
          user_id: user.id,
          listing_type: type,
          status: "draft",
          poc: poc as any,
          poc_verified: !isGeneric,
        }])
        .select()
        .single();
      if (listErr) throw listErr;

      toast.success("POC saved. Let's fill the listing details.");
      navigate(`/list-your-business/${type}/${listing.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <SEOHead
        title={`POC Verification — ${meta.label} | B School Buzz`}
        description="Verify yourself as the official Point of Contact to list your institute or college on B School Buzz."
        noIndex
      />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-2 text-sm text-muted-foreground">
          <span>List Your Business</span>
          <span>/</span>
          <span className="inline-flex items-center gap-1.5"><Icon className="w-4 h-4" /> {meta.label}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Point of Contact Details</h1>
        <p className="text-muted-foreground mb-8">
          We need your details to verify you're authorized to manage this listing. This stays private and is reviewed by our team.
        </p>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={setField("full_name")} placeholder="Your full name" />
              </div>
              <div>
                <Label>Designation *</Label>
                <Input value={form.designation} onChange={setField("designation")} placeholder="e.g. Director, Marketing Head" />
              </div>
              <div className="md:col-span-2">
                <Label>Organization Name *</Label>
                <Input value={form.organization} onChange={setField("organization")} placeholder="Official institute / college name" />
              </div>
              <div className="md:col-span-2">
                <Label>Official Website *</Label>
                <Input value={form.website} onChange={setField("website")} placeholder="https://www.example.com" />
              </div>
              <div className="md:col-span-2">
                <Label>Official Email *</Label>
                <Input type="email" value={form.email} onChange={setField("email")} placeholder="poc@institute.com" />
                <p className="text-xs text-muted-foreground mt-1">Use a domain-based email for faster verification.</p>
              </div>

              <div className="md:col-span-2 border border-border rounded-lg p-4 bg-muted/30">
                <Label>Mobile Number * {!isAdmin && <span className="text-xs font-normal text-muted-foreground">(OTP verification required)</span>}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.mobile}
                    onChange={setField("mobile")}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    disabled={otpVerified && !isAdmin}
                  />
                  {!isAdmin && !otpVerified && (
                    <Button type="button" variant="outline" onClick={sendOtp} disabled={sending}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : otpSent ? "Resend OTP" : "Send OTP"}
                    </Button>
                  )}
                </div>
                {!isAdmin && otpSent && !otpVerified && (
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                      maxLength={6}
                    />
                    <Button type="button" onClick={verifyOtp} disabled={verifying}>
                      {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                )}
                {otpVerified && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600 dark:text-green-400">
                    <ShieldCheck className="w-4 h-4" /> {isAdmin ? "Admin — OTP bypassed" : "Mobile verified"}
                  </div>
                )}
              </div>

              <div>
                <Label>WhatsApp Number *</Label>
                <Input value={form.whatsapp} onChange={setField("whatsapp")} placeholder="10-digit WhatsApp" maxLength={10} />
              </div>
              <div className="md:col-span-2">
                <StateCitySelect
                  state={form.state}
                  city={form.city}
                  onStateChange={(state) => setForm((f) => ({ ...f, state, city: "" }))}
                  onCityChange={(city) => setForm((f) => ({ ...f, city }))}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={submitting || (!otpVerified && !isAdmin)}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Continue to Listing Form <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
};

export default ListingPocPage;
