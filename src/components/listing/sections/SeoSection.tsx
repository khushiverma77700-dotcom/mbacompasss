import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TagInput from "@/components/listing/TagInput";

interface Props {
  value: any;
  onChange: (patch: any) => void;
}

const SeoSection = ({ value, onChange }: Props) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Primary Keyword</Label>
        <Input value={value.primary_keyword} onChange={(e) => onChange({ primary_keyword: e.target.value })} placeholder="e.g. best CAT coaching in Mumbai" />
      </div>
      <div>
        <Label>Meta Title</Label>
        <Input value={value.meta_title} onChange={(e) => onChange({ meta_title: e.target.value })} placeholder="< 60 characters" maxLength={70} />
        <p className="text-xs text-muted-foreground mt-1">{(value.meta_title || "").length}/60</p>
      </div>
      <div>
        <Label>Meta Description</Label>
        <Textarea value={value.meta_description} onChange={(e) => onChange({ meta_description: e.target.value })} rows={3} maxLength={170} placeholder="< 160 characters" />
        <p className="text-xs text-muted-foreground mt-1">{(value.meta_description || "").length}/160</p>
      </div>
      <TagInput label="Keywords" values={value.keywords || []} onChange={(keywords) => onChange({ keywords })} placeholder="Add a keyword and press Enter" />
    </div>
  );
};

export default SeoSection;
