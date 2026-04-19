import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Construction } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";

const ListingFormPage = () => {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const { user, loading } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase.from("user_listings").select("*").eq("id", id).maybeSingle();
      setListing(data);
      setFetching(false);
    })();
  }, [user, id]);

  if (loading || fetching) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!listing) {
    return <div className="container mx-auto py-16 text-center"><p>Listing not found.</p></div>;
  }

  return (
    <>
      <SEOHead title="Listing Form | B School Buzz" noIndex />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold capitalize">Your {type} Listing</h1>
          <p className="text-muted-foreground mt-1">POC verified. Now fill in the details — sections coming next.</p>
        </div>

        <Card className="p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Construction className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Form sections coming in Phase 2</h3>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Your draft has been saved. The full multi-section form (basic info, courses, fees, faculty, placements, results, media, etc.)
            will be enabled in the next phase. You'll be able to come back here anytime to continue editing.
          </p>
          <Button onClick={() => navigate("/my-listings")}>Back to My Listings</Button>
        </Card>
      </div>
    </>
  );
};

export default ListingFormPage;
