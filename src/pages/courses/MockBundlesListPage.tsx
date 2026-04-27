import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, ChevronRight } from "lucide-react";

export default function MockBundlesListPage() {
  const [bundles, setBundles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mock_bundles")
        .select("id, name, slug, description, exam_code, cover_image_url, price_inr, validity_days, items:mock_bundle_items(test_id)")
        .eq("is_published", true)
        .order("sort_order");
      setBundles(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Mock Test Bundles</h1>
        <p className="text-muted-foreground mt-2">Buy a bundle and instantly unlock every mock inside.</p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : bundles.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">No bundles available right now.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b) => (
            <Card key={b.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              {b.cover_image_url ? (
                <img src={b.cover_image_url} alt={b.name} className="w-full h-40 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center">
                  <Package className="h-12 w-12 text-sky-400" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  {b.exam_code && <Badge variant="outline">{b.exam_code}</Badge>}
                  <Badge variant="secondary">{b.items?.length ?? 0} mocks</Badge>
                </div>
                <h3 className="font-semibold text-lg">{b.name}</h3>
                {b.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">{b.description}</p>}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div>
                    <div className="text-2xl font-bold text-sky-600">₹{Number(b.price_inr).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {b.validity_days} days access</div>
                  </div>
                  <Button asChild size="sm">
                    <Link to={`/courses/${b.slug}`}>View <ChevronRight className="h-4 w-4 ml-1" /></Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
