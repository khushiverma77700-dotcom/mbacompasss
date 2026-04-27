import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, BrainCircuit, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { initMetaPixel, pixelTrack } from "@/lib/metaPixel";
import { SEOHead } from "@/components/SEOHead";

export default function MockThankYouPage() {
  const [params] = useSearchParams();
  const testSlug = params.get("test");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mocks_landing_settings")
        .select("meta_pixel_id, price_current")
        .maybeSingle();
      if (data?.meta_pixel_id) {
        initMetaPixel(data.meta_pixel_id);
        pixelTrack("Purchase", {
          value: data.price_current ?? 0,
          currency: "INR",
          content_name: "CAT Mock Bundle",
        });
        pixelTrack("CompleteRegistration");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white py-12 px-4">
      <SEOHead title="Thank You — Your CAT Mocks Are Ready" description="Your enrollment is confirmed." />
      <div className="container mx-auto max-w-3xl">
        <Card className="p-8 md:p-12 text-center border-sky-100 shadow-lg">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <h1 className="mt-6 text-3xl md:text-4xl font-bold">You're all set!</h1>
          <p className="mt-3 text-muted-foreground">
            Your enrollment is confirmed. Start your first mock anytime — your access is valid for 12 months.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {testSlug && (
              <Button size="lg" asChild>
                <Link to={`/mocks/${testSlug}`}>Start your first mock <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link to="/dashboard/mocks">Go to My Mocks</Link>
            </Button>
          </div>
        </Card>

        {/* Upsells */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-center">While you're here — try these free tools</h2>
          <div className="grid md:grid-cols-2 gap-5 mt-6">
            <Card className="p-6 border-sky-100 hover:shadow-md transition">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">AI Profile Analyzer</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get a personalised MBA admission roadmap based on your profile in 60 seconds.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/profile-analyzer">Analyze my profile <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </Card>
            <Card className="p-6 border-sky-100 hover:shadow-md transition">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                <Target className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">College Shortlister</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Discover MBA colleges that match your CAT score, profile and budget.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/college-shortlister">Shortlist colleges <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
