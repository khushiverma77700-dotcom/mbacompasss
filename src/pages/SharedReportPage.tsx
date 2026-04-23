import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, FileText } from "lucide-react";
import RadarChartCard from "@/components/profile-report/RadarChartCard";
import CollegeFitHeatmap from "@/components/profile-report/CollegeFitHeatmap";
import ScenarioSimulator from "@/components/profile-report/ScenarioSimulator";
import BenchmarkPanel from "@/components/profile-report/BenchmarkPanel";
import ROIScatterCard from "@/components/profile-report/ROIScatterCard";
import ExecutiveSummary from "@/components/profile-report/ExecutiveSummary";
import PdfDownloadButton from "@/components/profile-report/PdfDownloadButton";
import SEOHead from "@/components/SEOHead";

const SharedReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [narrative, setNarrative] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: pa } = await supabase.from("profile_analyses").select("*").eq("id", id).maybeSingle();
        const { data: ar } = await supabase.from("analysis_results").select("*").eq("profile_analysis_id", id).maybeSingle();
        setProfile(pa);
        setAnalysis(ar);
        if (ar?.ai_summary) {
          try { setNarrative(JSON.parse(ar.ai_summary)); } catch { /* legacy text summary */ }
        }
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <FileText className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">This report is no longer available.</p>
        <Link to="/profile-analyzer"><Button>Generate Your Own Report</Button></Link>
      </div>
    );
  }

  const breakdown = analysis?.probability_scores?.score_breakdown || analysis?.recommendations?.score_breakdown;
  const collegeRows = analysis?.college_predictions?.detailed_college_table || [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Shared MBA Profile Report — B School Buzz" description="Read-only premium MBA profile analysis." canonical={`/report/${id}`} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/profile-analyzer" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Generate your own report
          </Link>
          <PdfDownloadButton targetRef={reportRef} fileName={`mba-report-${id?.slice(0, 8)}.pdf`} />
        </div>

        <div ref={reportRef} className="space-y-6">
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <CardTitle className="text-2xl">{profile.name ? `${profile.name.split(" ")[0]}'s MBA Report` : "MBA Profile Report"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Read-only shareable view</p>
                </div>
                <Badge className="text-sm">Profile Score {profile.profile_score ?? "—"}/10</Badge>
              </div>
            </CardHeader>
          </Card>

          {narrative && (
            <ExecutiveSummary
              oneLine={narrative.one_line_summary}
              verdict={narrative.final_verdict}
              strengths={(narrative.top_advantages || []).map((a: any) => ({ title: a.title, impact: "high" }))}
              weaknesses={(narrative.top_risks || []).map((r: any) => ({ title: r.title, severity: "high" }))}
            />
          )}

          {breakdown && <RadarChartCard breakdown={breakdown} />}
          {collegeRows.length > 0 && (
            <>
              <CollegeFitHeatmap rows={collegeRows} />
              <ScenarioSimulator rows={collegeRows} profile={profile} />
              <ROIScatterCard rows={collegeRows} />
            </>
          )}
          {breakdown && <BenchmarkPanel breakdown={breakdown} profile={profile} />}
        </div>
      </div>
    </div>
  );
};

export default SharedReportPage;
