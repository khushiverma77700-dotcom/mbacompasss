import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Result {
  year: number;
  college_name: string;
  students_selected: number;
  description: string;
}

interface Props {
  value: { results_list: Result[] };
  onChange: (patch: any) => void;
}

const ResultsSection = ({ value, onChange }: Props) => {
  const results = value.results_list || [];

  const update = (i: number, patch: Partial<Result>) =>
    onChange({ results_list: results.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const add = () =>
    onChange({
      results_list: [
        ...results,
        { year: new Date().getFullYear(), college_name: "", students_selected: 0, description: "" },
      ],
    });
  const remove = (i: number) => onChange({ results_list: results.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {results.length === 0 && (
        <p className="text-sm text-muted-foreground">Add year-wise selections to top colleges (e.g. IIM-A: 12 selections in 2024).</p>
      )}
      {results.map((r, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Result #{i + 1}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Year</Label>
              <Input type="number" value={r.year} onChange={(e) => update(i, { year: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="md:col-span-2">
              <Label>College / Achievement</Label>
              <Input value={r.college_name} onChange={(e) => update(i, { college_name: e.target.value })} placeholder="e.g. IIM Ahmedabad" />
            </div>
            <div>
              <Label>Students Selected</Label>
              <Input type="number" value={r.students_selected} onChange={(e) => update(i, { students_selected: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="md:col-span-3">
              <Label>Description</Label>
              <Textarea value={r.description} onChange={(e) => update(i, { description: e.target.value })} rows={2} />
            </div>
          </div>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Add Result
      </Button>
    </div>
  );
};

export default ResultsSection;
