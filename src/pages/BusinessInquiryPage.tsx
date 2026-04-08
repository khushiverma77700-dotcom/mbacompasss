import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Rocket, Building2, GraduationCap, CheckCircle2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import SEOHead from "@/components/SEOHead";

const formSchema = z.object({
  institute_name: z.string().trim().min(2, "Institute name is required").max(255),
  poc_name: z.string().trim().min(2, "POC name is required").max(255),
  website_url: z.string().trim().url("Enter a valid URL").or(z.literal("")).optional(),
  contact_number: z.string().trim().regex(/^[+]?[\d\s\-()]{7,20}$/, "Enter a valid phone number"),
  whatsapp_number: z.string().trim().regex(/^[+]?[\d\s\-()]{7,20}$/, "Enter a valid WhatsApp number"),
  poc_email: z.string().trim().email("Enter a valid email").max(255),
  same_as_contact: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const BusinessInquiryForm = ({ instituteType }: { instituteType: "Coaching Institute" | "College" }) => {
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      institute_name: "",
      poc_name: "",
      website_url: "",
      contact_number: "",
      whatsapp_number: "",
      poc_email: "",
      same_as_contact: false,
    },
  });

  const sameAsContact = form.watch("same_as_contact");
  const contactNumber = form.watch("contact_number");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const { error } = await supabase.from("business_inquiries").insert({
      institute_type: instituteType,
      institute_name: values.institute_name,
      poc_name: values.poc_name,
      website_url: values.website_url || null,
      contact_number: values.contact_number,
      whatsapp_number: sameAsContact ? values.contact_number : values.whatsapp_number,
      poc_email: values.poc_email,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }

    setShowSuccess(true);
    form.reset();
  };

  return (
    <>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg bg-muted/50 px-4 py-3 border border-border">
          <p className="text-sm font-medium text-foreground">Institute Type: <span className="text-primary font-semibold">{instituteType}</span></p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="institute_name">Institute Name *</Label>
            <Input id="institute_name" placeholder="e.g. Career Launcher" {...form.register("institute_name")} />
            {form.formState.errors.institute_name && <p className="text-xs text-destructive">{form.formState.errors.institute_name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="poc_name">Point of Contact (POC) Name *</Label>
            <Input id="poc_name" placeholder="e.g. Rahul Sharma" {...form.register("poc_name")} />
            {form.formState.errors.poc_name && <p className="text-xs text-destructive">{form.formState.errors.poc_name.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="website_url">Website URL</Label>
          <Input id="website_url" placeholder="https://www.example.com" {...form.register("website_url")} />
          {form.formState.errors.website_url && <p className="text-xs text-destructive">{form.formState.errors.website_url.message}</p>}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact_number">Contact Number *</Label>
            <Input id="contact_number" placeholder="+91 98765 43210" {...form.register("contact_number")} />
            {form.formState.errors.contact_number && <p className="text-xs text-destructive">{form.formState.errors.contact_number.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp_number">WhatsApp Number *</Label>
            <Input
              id="whatsapp_number"
              placeholder="+91 98765 43210"
              disabled={!!sameAsContact}
              value={sameAsContact ? contactNumber : undefined}
              {...(!sameAsContact ? form.register("whatsapp_number") : {})}
            />
            {form.formState.errors.whatsapp_number && !sameAsContact && <p className="text-xs text-destructive">{form.formState.errors.whatsapp_number.message}</p>}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="same_as_contact"
                checked={!!sameAsContact}
                onCheckedChange={(v) => {
                  form.setValue("same_as_contact", !!v);
                  if (v) form.setValue("whatsapp_number", contactNumber);
                }}
              />
              <label htmlFor="same_as_contact" className="text-xs text-muted-foreground cursor-pointer">Same as Contact Number</label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="poc_email">POC Email Address *</Label>
          <Input id="poc_email" type="email" placeholder="rahul@example.com" {...form.register("poc_email")} />
          {form.formState.errors.poc_email && <p className="text-xs text-destructive">{form.formState.errors.poc_email.message}</p>}
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Inquiry"}
        </Button>
      </form>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader className="items-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mb-2" />
            <DialogTitle className="text-xl">Thank You!</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground space-y-2 pt-2">
              <p>Thank you for your submission! Our team will review your details and reach out within the next <strong>24 hours</strong>. Please wait for our response.</p>
              <p className="flex items-center justify-center gap-1.5 text-primary font-medium pt-2">
                <Phone className="w-4 h-4" /> Please keep your phone reachable for faster onboarding.
              </p>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowSuccess(false)} className="mt-2">Got it</Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

const BusinessInquiryPage = () => {
  return (
    <>
      <SEOHead
        title="Business Inquiries — List Your Institute on MBAHub"
        description="Get your coaching institute or college listed on MBAHub. Reach thousands of MBA aspirants and increase your student enrollments."
        canonical="https://bestmbacoaching.com/business-inquiries"
      />
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* CTA Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Partner With Us</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3 font-heading">
              Grow Your Institute with Us 🚀
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto leading-relaxed">
              We are actively connecting with thousands of students and helping institutes increase visibility and enrollments.
              Fill out the form below to get your college or coaching institute listed on our platform.
              <br />
              <strong className="text-foreground">Our team will connect with you within 24 hours.</strong>
            </p>
          </div>

          {/* Tabbed Form */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <Tabs defaultValue="coaching" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="coaching" className="gap-2">
                  <Building2 className="w-4 h-4" /> Coaching Institute
                </TabsTrigger>
                <TabsTrigger value="college" className="gap-2">
                  <GraduationCap className="w-4 h-4" /> College
                </TabsTrigger>
              </TabsList>
              <TabsContent value="coaching">
                <BusinessInquiryForm instituteType="Coaching Institute" />
              </TabsContent>
              <TabsContent value="college">
                <BusinessInquiryForm instituteType="College" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </>
  );
};

export default BusinessInquiryPage;
