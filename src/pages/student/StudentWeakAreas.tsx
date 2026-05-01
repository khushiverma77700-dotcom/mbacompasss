import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw, ArrowRight, BookOpenCheck } from "lucide-react";
import {
  useStrengthWeaknessData,
  ReadinessBadge,
  TopicAnalysisPanel,
} from "@/components/student/StrengthWeaknessAnalysis";

export default function StudentWeakAreas() {
  const { loading, hasData, weakTopics, allTopics, overallReadiness, refresh } =
    useStrengthWeaknessData();

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            My Weak Areas
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Auto-generated from every mock you have submitted. These are the topics with the lowest
            readiness — fix them first for the biggest score gains.
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
          {/* Summary strip */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpenCheck className="h-4 w-4 text-sky-600" />
                Live snapshot — updates whenever you submit a new mock.
              </div>
              <div className="flex items-center gap-6">
                <ReadinessBadge label="Overall Readiness" value={overallReadiness} />
                <ReadinessBadge label="Weak Topics" value={weakTopics.length} suffix="" tone="weak" />
                <ReadinessBadge label="Total Topics" value={allTopics.length} suffix="" />
              </div>
            </div>
          </Card>

          {weakTopics.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm">
                <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50 mr-2">
                  Great work
                </Badge>
                No weak topics detected yet — keep attempting mocks to surface improvement areas.
              </div>
            </Card>
          ) : (
            <TopicAnalysisPanel
              heading="Topics that need urgent attention"
              description="Sorted by readiness (lowest first). Each topic shows accuracy, sub-topic drill-down, time taken and trend across mocks."
              topics={weakTopics}
              tone="weak"
            />
          )}

          {/* CTA */}
          <Card className="p-5 border-sky-100 bg-gradient-to-r from-sky-50 to-white">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">Practice these weak areas</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Use sectional and topic-wise mocks to target the topics above.
                </p>
              </div>
              <Link to="/student/mocks/sectional">
                <Button className="gap-2">
                  Practice now <ArrowRight className="h-3.5 w-3.5" />
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
        Attempt at least one mock to unlock detailed weak-area analysis.
      </p>
      <Link to="/student/mocks/full-length">
        <Button size="sm" className="mt-3">Take a mock</Button>
      </Link>
    </Card>
  );
}
