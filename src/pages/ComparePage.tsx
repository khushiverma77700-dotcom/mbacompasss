import { useState } from "react";
import { X, Star, Tag, CheckCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { institutes, type Institute, type Course } from "@/data/mockData";

type Selection = { institute: Institute; course: Course } | null;

const ComparePage = () => {
  const [selections, setSelections] = useState<[Selection, Selection, Selection]>([null, null, null]);

  const allCourses = institutes.flatMap((inst) =>
    inst.courses.map((c) => ({ institute: inst, course: c }))
  );

  const handleSelect = (index: number, value: string) => {
    const found = allCourses.find((x) => x.course.id === value);
    if (found) {
      const next = [...selections] as [Selection, Selection, Selection];
      next[index] = found;
      setSelections(next);
    }
  };

  const handleRemove = (index: number) => {
    const next = [...selections] as [Selection, Selection, Selection];
    next[index] = null;
    setSelections(next);
  };

  const active = selections.filter(Boolean) as { institute: Institute; course: Course }[];

  // "Best for You" algorithm — ranks by value score
  const bestForYou = active.length >= 2
    ? [...active].sort((a, b) => {
        const scoreA = a.institute.rating * 20 + parseFloat(a.institute.successRate) - (a.course.feesNum / 10000);
        const scoreB = b.institute.rating * 20 + parseFloat(b.institute.successRate) - (b.course.feesNum / 10000);
        return scoreB - scoreA;
      })
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
            Compare MBA Courses
          </h1>
          <p className="text-primary-foreground/70">Select up to 3 MBA courses to compare side by side</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Selection cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="pt-6">
                {selections[i] ? (
                  <div className="relative">
                    <button
                      onClick={() => handleRemove(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="text-center">
                      <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-3 text-primary-foreground font-bold">
                        {selections[i]!.institute.name.charAt(0)}
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-sm">{selections[i]!.institute.name}</h3>
                      <p className="text-xs text-primary font-medium mt-1">{selections[i]!.course.name}</p>
                    </div>
                  </div>
                ) : (
                  <Select onValueChange={(v) => handleSelect(i, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an MBA course" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCourses
                        .filter((x) => !selections.some((s) => s?.course.id === x.course.id))
                        .map((x) => (
                          <SelectItem key={x.course.id} value={x.course.id}>
                            {x.institute.name} — {x.course.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {active.length >= 2 && (
          <Tabs defaultValue="comparison" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
              <TabsTrigger value="offers">Check Offers</TabsTrigger>
              <TabsTrigger value="bestforyou">Best for You</TabsTrigger>
            </TabsList>

            {/* Comparison Tab */}
            <TabsContent value="comparison">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="pt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground min-w-[120px]">Feature</th>
                          {active.map((s) => (
                            <th key={s.course.id} className="text-left py-3 px-3 font-heading font-semibold text-foreground min-w-[150px]">
                              {s.institute.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: "Course", render: (s: typeof active[0]) => s.course.name },
                          { label: "Fees", render: (s: typeof active[0]) => <span className="font-semibold text-primary">{s.course.fees}</span> },
                          { label: "Duration", render: (s: typeof active[0]) => s.course.duration },
                          { label: "Mode", render: (s: typeof active[0]) => <Badge variant="secondary" className="text-xs">{s.course.mode}</Badge> },
                          { label: "Batch Size", render: (s: typeof active[0]) => s.course.batchSize },
                          { label: "Start Date", render: (s: typeof active[0]) => s.course.startDate },
                          { label: "Institute Rating", render: (s: typeof active[0]) => <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {s.institute.rating}</span> },
                          { label: "Reviews", render: (s: typeof active[0]) => `${s.institute.reviewCount} reviews` },
                          { label: "Location", render: (s: typeof active[0]) => s.institute.location },
                          { label: "Success Rate", render: (s: typeof active[0]) => s.institute.successRate },
                          { label: "Students", render: (s: typeof active[0]) => s.institute.students },
                          { label: "Established", render: (s: typeof active[0]) => String(s.institute.established) },
                          { label: "Curriculum", render: (s: typeof active[0]) => (
                            <div className="space-y-1">
                              {s.course.curriculum.slice(0, 3).map((c, i) => (
                                <div key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{c.split("—")[0].trim()}</span>
                                </div>
                              ))}
                              {s.course.curriculum.length > 3 && (
                                <span className="text-xs text-primary">+{s.course.curriculum.length - 3} more</span>
                              )}
                            </div>
                          )},
                        ].map((row) => (
                          <tr key={row.label} className="border-b border-border">
                            <td className="py-3 px-3 text-muted-foreground font-medium">{row.label}</td>
                            {active.map((s) => (
                              <td key={s.course.id} className="py-3 px-3 text-foreground">{row.render(s)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((s) => (
                  <Card key={s.course.id} className="border-primary/30 bg-secondary/30">
                    <CardContent className="pt-6">
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-3 text-primary-foreground font-bold">
                          {s.institute.name.charAt(0)}
                        </div>
                        <h3 className="font-heading font-semibold text-foreground">{s.institute.name}</h3>
                        <p className="text-sm text-primary">{s.course.name}</p>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-card rounded-lg p-3 border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">Discount</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{s.institute.discount}</p>
                        </div>
                        {s.institute.offer && (
                          <div className="bg-card rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle className="w-4 h-4 text-primary" />
                              <span className="text-sm font-semibold text-foreground">Special Offer</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{s.institute.offer}</p>
                          </div>
                        )}
                        <div className="text-center pt-2">
                          <p className="text-lg font-heading font-bold text-primary mb-2">{s.course.fees}</p>
                          <Link to={`/institute/${s.institute.slug}`}>
                            <Button size="sm" className="w-full gap-1">
                              View Details <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Best for You Tab */}
            <TabsContent value="bestforyou">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading">Personalized Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-6">
                    Based on rating, success rate, and value-for-money analysis:
                  </p>
                  <div className="space-y-4">
                    {bestForYou.map((s, i) => {
                      const score = (s.institute.rating * 20 + parseFloat(s.institute.successRate) - (s.course.feesNum / 10000)).toFixed(1);
                      return (
                        <motion.div
                          key={s.course.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className={`flex items-center gap-4 p-4 rounded-xl border ${
                            i === 0 ? "border-primary bg-secondary/50" : "border-border"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                            i === 0 ? "hero-gradient text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}>
                            #{i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-heading font-semibold text-foreground">{s.institute.name}</h3>
                              {i === 0 && <Badge className="bg-primary text-primary-foreground text-xs">Recommended</Badge>}
                            </div>
                            <p className="text-sm text-primary">{s.course.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {s.institute.rating}</span>
                              <span>{s.institute.successRate} success</span>
                              <span className="font-semibold text-foreground">{s.course.fees}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs text-muted-foreground mb-1">Value Score</div>
                            <div className="font-heading font-bold text-primary text-lg">{score}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {active.length < 2 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select at least 2 MBA courses above to see a comparison</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePage;
