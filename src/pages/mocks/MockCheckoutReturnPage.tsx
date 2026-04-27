import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function MockCheckoutReturnPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const testId = params.get("test_id");
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed">("checking");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get("session_id");
  const testId = params.get("test_id");
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed">("checking");

  useEffect(() => {
    if (!sessionId) {
      setStatus("failed");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      const { data } = await supabase
        .from("mock_payments")
        .select("status")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.status === "paid") setStatus("paid");
      else if (data?.status === "failed") setStatus("failed");
      else if (attempts < 15) setTimeout(poll, 1500);
      else setStatus("pending");
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-muted/30">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        {status === "checking" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Confirming your payment…</h1>
            <p className="text-muted-foreground text-sm">This usually takes a few seconds.</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="h-14 w-14 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold">Payment successful!</h1>
            <p className="text-muted-foreground">
              You're enrolled. You can start the test now or anytime from your dashboard.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {testId && (
                <Button onClick={() => navigate(`/mocks/${testId}/intro`)}>Start test now</Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/dashboard/mocks">Go to My Mocks</Link>
              </Button>
            </div>
          </>
        )}
        {status === "pending" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h1 className="text-xl font-semibold">Still processing…</h1>
            <p className="text-muted-foreground text-sm">
              Your payment is taking longer than expected. We'll enroll you automatically once it
              clears.
            </p>
            <Button variant="outline" asChild>
              <Link to="/dashboard/mocks">Go to My Mocks</Link>
            </Button>
          </>
        )}
        {status === "failed" && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-xl font-semibold">Payment not completed</h1>
            <p className="text-muted-foreground text-sm">Please try again or contact support.</p>
            <Button asChild>
              <Link to="/mocks">Back to Mocks</Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
