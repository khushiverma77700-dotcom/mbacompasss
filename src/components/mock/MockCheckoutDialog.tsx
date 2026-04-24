import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  testName: string;
  priceInr: number;
  onEnrolled?: () => void;
}

export function MockCheckoutDialog({
  open,
  onOpenChange,
  testId,
  testName,
  priceInr,
  onEnrolled,
}: Props) {
  const [coupon, setCoupon] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setCoupon("");
    }
  }, [open]);

  const startCheckout = async () => {
    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}/mocks/checkout/return?session_id={CHECKOUT_SESSION_ID}&test_id=${testId}`;
      const { data, error } = await supabase.functions.invoke("create-mock-checkout", {
        body: {
          testId,
          couponCode: coupon.trim() || undefined,
          returnUrl,
          environment: getStripeEnvironment(),
        },
      });
      if (error) throw error;
      if (data?.free && data?.enrolled) {
        toast.success("Coupon applied! You're enrolled.");
        onEnrolled?.();
        onOpenChange(false);
        return;
      }
      if (!data?.clientSecret) throw new Error("No checkout session returned");
      setClientSecret(data.clientSecret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enroll: {testName}</DialogTitle>
        </DialogHeader>
        <PaymentTestModeBanner />

        {!clientSecret ? (
          <div className="space-y-4 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="text-2xl font-bold">₹{priceInr}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon">Have a coupon?</Label>
              <Input
                id="coupon"
                placeholder="Enter coupon code"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              />
            </div>
            <Button className="w-full" onClick={startCheckout} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Proceed to Payment"}
            </Button>
          </div>
        ) : (
          <div id="checkout" className="mt-2">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
