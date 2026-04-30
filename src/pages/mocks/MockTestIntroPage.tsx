import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Clock, AlertTriangle, Layers, ShieldAlert } from "lucide-react";
import { isStudentMode, studentBackToMocksPath } from "@/lib/studentModeNav";


export default function MockTestIntroPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [test, setTest] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: t } = await supabase
        .from("mock_tests")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!t) {
        setLoading(false);
        return;
      }
      const { data: s } = await supabase
        .from("mock_sections")
        .select("*")
        .eq("test_id", t.id)
        .order("sort_order");
      setTest(t);
      setSections(s ?? []);
      setLoading(false);
    })();
  }, [slug]);

  const handleStart = async () => {
    if (!user) {
      toast.error("Please sign in to take the mock");
      navigate("/auth");
      return;
    }
    if (!agreed) {
      toast.error("Please agree to the rules");
      return;
    }
    setStarting(true);
    try {
      // Mobile devices: skip fullscreen (unsupported / unreliable on iOS Safari)
      const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
      if (!isMobile) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          toast.error("Fullscreen is required to start the test");
          setStarting(false);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("mock-start-attempt", {
        body: { test_id: test.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const attempt = (data as any).attempt;
      navigate(`/mocks/attempt/${attempt.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start test");
      setStarting(false);
    }
  };

  if (loading || authLoading) {
    return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading…</div>;
  }
  if (!test) {
    return <div className="container mx-auto px-4 py-12">Test not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      
      <Card className="p-6 md:p-8">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">{test.name}</h1>
          <Badge variant={test.pricing_type === "free" ? "secondary" : "default"}>
            {test.pricing_type === "free" ? "Free" : `₹${test.price_inr}`}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="border rounded-md p-3 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span><strong>{test.total_duration_minutes}</strong> min total</span>
          </div>
          <div className="border rounded-md p-3 text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <span><strong>{sections.length}</strong> sections</span>
          </div>
          <div className="border rounded-md p-3 text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span>Strict CAT mode</span>
          </div>
        </div>

        <p className="font-semibold mb-2 text-sm">Sections</p>
        <div className="border rounded-md divide-y mb-6">
          {sections.map((s, i) => (
            <div key={s.id} className="p-3 flex justify-between text-sm">
              <span><strong>{i + 1}. {s.name}</strong> ({s.code})</span>
              <span className="text-muted-foreground">{s.duration_minutes} min · {s.total_questions} Qs</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Strict CAT-mode rules
          </div>
          <ul className="list-disc list-inside text-amber-900 space-y-1">
            <li>On desktop the test runs in <strong>fullscreen</strong>. On mobile, keep the app in foreground.</li>
            <li><strong>Tab/app switching</strong> is detected. After 3 violations the test auto-submits.</li>
            <li>Sections are <strong>time-locked</strong> — once the section timer ends, you cannot return.</li>
            <li>Right-click and copy/paste are disabled.</li>
            <li>Answers <strong>auto-save</strong>. Server controls the timer — refreshing won't grant extra time.</li>
            <li>+3 marks for correct MCQ, −1 for incorrect MCQ. TITA: +3 / 0.</li>
          </ul>
        </div>

        <label className="flex items-start gap-2 mb-6 cursor-pointer">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-1" />
          <span className="text-sm">
            I have read and understood all the rules. I agree to take this mock under strict CAT-like conditions.
          </span>
        </label>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/mocks")}>Back</Button>
          <Button onClick={handleStart} disabled={!agreed || starting} className="flex-1">
            {starting ? "Starting…" : "Start Mock Test"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
