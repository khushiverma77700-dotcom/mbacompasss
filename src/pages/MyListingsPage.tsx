import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Plus, Eye, Pencil, Building2, GraduationCap, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { storePostAuthRedirect } from "@/lib/authRedirect";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  changes_requested: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending Review",
  changes_requested: "Changes Requested",
  approved: "Approved & Live",
  rejected: "Rejected",
};

const TYPE_ICON: Record<string, any> = {
  coaching: Building2,
  college: GraduationCap,
  request: FileQuestion,
};

const MyListingsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      storePostAuthRedirect("/my-listings");
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const { data } = await supabase
        .from("user_listings")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setListings(data || []);
      setFetching(false);
    })();
  }, [user]);

  if (loading || !user) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <SEOHead title="My Listings | B School Buzz" description="Manage your submitted coaching and college listings." noIndex />
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Listings</h1>
            <p className="text-muted-foreground mt-1">Track the status of every listing you've submitted.</p>
          </div>
          <Button asChild>
            <Link to="/list-your-business"><Plus className="w-4 h-4 mr-2" /> New Listing</Link>
          </Button>
        </div>

        {fetching ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : listings.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No listings yet</h3>
            <p className="text-sm text-muted-foreground mb-5">Start by submitting your coaching institute or college.</p>
            <Button asChild><Link to="/list-your-business">Create your first listing</Link></Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => {
              const Icon = TYPE_ICON[l.listing_type] || Building2;
              const orgName = (l.poc as any)?.organization || (l.payload as any)?.name || "Untitled listing";
              return (
                <Card key={l.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{orgName}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {l.listing_type} • Updated {new Date(l.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_STYLES[l.status] || STATUS_STYLES.draft}>{STATUS_LABEL[l.status]}</Badge>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/list-your-business/${l.listing_type}/${l.id}`}>
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          {l.status === "approved" ? "Edit live listing" : l.status === "pending" ? "View" : "Edit"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {l.admin_notes && (
                    <div className="mt-3 p-3 rounded-md bg-muted/50 text-sm">
                      <span className="font-medium">Admin note:</span> {l.admin_notes}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default MyListingsPage;
