import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Receipt, Package } from "lucide-react";

export default function StudentOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("mock_orders")
        .select("*, mock_order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Receipt className="h-6 w-6 text-sky-600" /> Order History</h1>
        <p className="text-sm text-muted-foreground mt-1">All your mock test purchases and invoices.</p>
      </div>

      {loading ? <div className="text-muted-foreground">Loading…</div> : orders.length === 0 ? (
        <Card className="p-12 text-center border-sky-100">
          <Package className="h-10 w-10 mx-auto text-sky-300 mb-3" />
          <div className="font-medium">No orders yet</div>
          <div className="text-sm text-muted-foreground mt-1">Browse mocks and your purchases will appear here.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className="p-5 border-sky-100">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8)}</div>
                  <div className="font-medium text-gray-900 mt-0.5">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-bold text-sky-700">₹{Number(o.final_amount).toFixed(0)}</div>
                  <div className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full ${o.status === "paid" ? "bg-green-100 text-green-700" : o.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                    {o.status?.toUpperCase()}
                  </div>
                </div>
              </div>
              {o.mock_order_items?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-sky-50 space-y-1.5">
                  {o.mock_order_items.map((it: any) => (
                    <div key={it.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{it.item_name} × {it.quantity}</span>
                      <span className="font-medium">₹{Number(it.unit_price).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
              {o.coupon_code && (
                <div className="text-xs text-green-700 mt-2">Coupon used: <strong>{o.coupon_code}</strong> (-₹{Number(o.discount_amount).toFixed(0)})</div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
