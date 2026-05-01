import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, RefreshCw, ArrowRight, BookOpenCheck } from "lucide-react";
import {
  useStrengthWeaknessData,
  ReadinessBadge,
  TopicAnalysisPanel,
} from "@/components/student/StrengthWeaknessAnalysis";

export default function StudentStrengthAreas() {
  const { loading, hasData, strongTopics, allTopics, overallReadiness, refresh } =
    useStrengthWeaknessData();

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-sky-600" />
            My Strength Areas
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Topics where you are consistently accurate across mocks. Maintain these through
            revision and speed drills — they are your scoring backbone.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Analysing your performance…</div>
        </Card>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpenCheck className="h-4 w-4 text-sky-600" />
                Live snapshot — updates whenever you submit a new mock.
              </div>
              <div className="flex items-center gap-6">
                <ReadinessBadge label="Overall Readiness" value={overallReadiness} />
                <ReadinessBadge label="Strong Topics" value={strongTopics.length} suffix="" tone="strong" />
                <ReadinessBadge label="Total Topics" value={allTopics.length} suffix="" />
              </div>
            </div>
          </Card>

          {strongTopics.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm">
                <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 mr-2">
                  Building up
                </Badge>
                No strong topics yet — attempt more mocks consistently to build readiness above 65%.
              </div>
            </Card>
          ) : (
            <TopicAnalysisPanel
              heading="Topics where you are scoring well"
              description="Sorted by readiness (highest first). Includes sub-topic accuracy, attempts, time taken and trend across mocks."
              topics={strongTopics}
              tone="strong"
            />
          )}

          <Card className="p-5 border-sky-100 bg-gradient-to-r from-sky-50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">Lock in your strengths</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Take full-length mocks to convert these strengths into a higher overall percentile.
                </p>
              </div>
              <Link to="/student/mocks/full-length">
                <Button className="gap-2">
                  Attempt full mock <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-6 border-sky-100 bg-sky-50/40">
      <h3 className="font-semibold text-slate-900">No mock data yet</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Attempt at least one mock to unlock detailed strength-area analysis.
      </p>
      <Link to="/student/mocks/full-length">
        <Button size="sm" className="mt-3">Take a mock</Button>
      </Link>
    </Card>
  );
}
