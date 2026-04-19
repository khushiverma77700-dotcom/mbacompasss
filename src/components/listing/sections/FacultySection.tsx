import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import FileUpload from "@/components/admin/FileUpload";

interface Faculty {
  name: string;
  designation: string;
  qualification: string;
  experience: string;
  specialization: string;
  bio: string;
  photo_url: string;
}

interface Props {
  value: { faculty_list: Faculty[] };
  onChange: (patch: any) => void;
}

const FacultySection = ({ value, onChange }: Props) => {
  const faculty = value.faculty_list || [];

  const update = (i: number, patch: Partial<Faculty>) => {
    onChange({ faculty_list: faculty.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  };
  const add = () =>
    onChange({
      faculty_list: [
        ...faculty,
        { name: "", designation: "", qualification: "", experience: "", specialization: "", bio: "", photo_url: "" },
      ],
    });
  const remove = (i: number) => onChange({ faculty_list: faculty.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      {faculty.length === 0 && (
        <p className="text-sm text-muted-foreground">Showcase your teaching team to build credibility.</p>
      )}
      {faculty.map((f, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Faculty #{i + 1}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={f.name} onChange={(e) => update(i, { name: e.target.value })} />
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={f.designation} onChange={(e) => update(i, { designation: e.target.value })} placeholder="e.g. Senior Faculty" />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input value={f.qualification} onChange={(e) => update(i, { qualification: e.target.value })} placeholder="e.g. IIM-A Alumnus" />
            </div>
            <div>
              <Label>Experience</Label>
              <Input value={f.experience} onChange={(e) => update(i, { experience: e.target.value })} placeholder="e.g. 12 years" />
            </div>
            <div>
              <Label>Specialization</Label>
              <Input value={f.specialization} onChange={(e) => update(i, { specialization: e.target.value })} placeholder="e.g. Quant & DI" />
            </div>
            <div>
              <FileUpload
                bucket="listing-uploads"
                folder="faculty"
                value={f.photo_url}
                onChange={(url) => update(i, { photo_url: url })}
                accept="image/*"
                label="Photo"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Bio</Label>
              <Textarea value={f.bio} onChange={(e) => update(i, { bio: e.target.value })} rows={2} />
            </div>
          </div>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="w-4 h-4 mr-2" /> Add Faculty Member
      </Button>
    </div>
  );
};

export default FacultySection;
