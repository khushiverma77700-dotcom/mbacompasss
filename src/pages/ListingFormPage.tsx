import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { storePostAuthRedirect } from "@/lib/authRedirect";
import ListingFormShell from "@/components/listing/ListingFormShell";
import type { ListingType } from "@/lib/listingFormSchema";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Review",
  changes_requested: "Changes Requested",
  approved: "Approved & Live",
  rejected: "Rejected",
};

const ListingFormPage = () => {
  const navigate = useNavigate();
  const { type, id } = useParams();
  const { user, loading } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      storePostAuthRedirect(`/list-your-business/${type}/${id}`);
      navigate("/auth");
    }
  }, [loading, user, navigate, type, id]);

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

  const listingType = (listing.listing_type as ListingType) || "coaching";
  const orgName = (listing.poc as any)?.organization || (listing.payload as any)?.name || "Untitled listing";

  return (
    <>
      <SEOHead title={`Edit Listing — ${orgName} | B School Buzz`} noIndex />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Link to="/my-listings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to My Listings
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">{orgName}</h1>
              <p className="text-muted-foreground mt-1 capitalize">
                {listingType} listing
              </p>
            </div>
            <div className="flex items-center gap-2">
              {listing.poc_verified ? (
                <Badge variant="secondary" className="gap-1"><ShieldCheck className="w-3 h-3" /> POC Verified</Badge>
              ) : (
                <Badge variant="outline" className="gap-1"><ShieldAlert className="w-3 h-3" /> POC Unverified</Badge>
              )}
              <Badge>{STATUS_LABEL[listing.status] || listing.status}</Badge>
            </div>
          </div>
          {listing.admin_notes && (
            <div className="mt-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm">
              <span className="font-medium">Admin note:</span> {listing.admin_notes}
            </div>
          )}
        </div>

        <ListingFormShell listing={listing} type={listingType} />
      </div>
    </>
  );
};

export default ListingFormPage;
