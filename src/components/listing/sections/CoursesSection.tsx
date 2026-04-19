import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Course {
  name: string;
  duration: string;
  mode: string;
  fees: string;
  description: string;
}

interface Props {
  value: { courses_list: Course[] };
  onChange: (patch: any) => void;
}

const CoursesSection = ({ value, onChange }: Props) => {
  const courses = value.courses_list || [];

  const update = (i: number, patch: Partial<Course>) => {
    const next = courses.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    onChange({ courses_list: next });
  };

  const add = () =>
    onChange({
      courses_list: [...courses, { name: "", duration: "", mode: "Offline", fees: "", description: "" }],
    });

  const remove = (i: number) => onChange({ courses_list: courses.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {courses.length === 0 && (
        <p className="text-sm text-muted-foreground">No courses added yet. Add the programs your institute offers.</p>
      )}
      {courses.map((c, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Course #{i + 1}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Course Name</Label>
              <Input value={c.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. CAT Crash Course" />
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={c.duration} onChange={(e) => update(i, { duration: e.target.value })} placeholder="e.g. 3 months" />
            </div>
            <div>
              <Label>Mode</Label>
              <Input value={c.mode} onChange={(e) => update(i, { mode: e.target.value })} placeholder="Offline / Online / Hybrid" />
            </div>
            <div>
              <Label>Fees</Label>
              <Input value={c.fees} onChange={(e) => update(i, { fees: e.target.value })} placeholder="e.g. ₹45,000" />
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea value={c.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} />
            </div>
          </div>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Add Course
      </Button>
    </div>
  );
};

export default CoursesSection;
