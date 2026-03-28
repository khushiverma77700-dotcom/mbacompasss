import { useState } from "react";
import { X, Plus, Star, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
            Compare Courses
          </h1>
          <p className="text-primary-foreground/70">Select up to 3 courses to compare side by side</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4 mb-8">
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
                  <div>
                    <Select onValueChange={(v) => handleSelect(i, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {active.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-heading font-semibold text-foreground">Feature</th>
                      {active.map((s) => (
                        <th key={s.course.id} className="text-left py-3 px-4 font-heading font-semibold text-foreground">
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
                      { label: "Mode", render: (s: typeof active[0]) => s.course.mode },
                      { label: "Institute Rating", render: (s: typeof active[0]) => <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-cat-mba text-cat-mba" /> {s.institute.rating}</span> },
                      { label: "Reviews", render: (s: typeof active[0]) => `${s.institute.reviewCount} reviews` },
                      { label: "Location", render: (s: typeof active[0]) => s.institute.location },
                      { label: "Success Rate", render: (s: typeof active[0]) => s.institute.successRate },
                      { label: "Established", render: (s: typeof active[0]) => String(s.institute.established) },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-border">
                        <td className="py-3 px-4 text-muted-foreground font-medium">{row.label}</td>
                        {active.map((s) => (
                          <td key={s.course.id} className="py-3 px-4 text-foreground">{row.render(s)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {active.length < 2 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Select at least 2 courses above to see a comparison</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparePage;
