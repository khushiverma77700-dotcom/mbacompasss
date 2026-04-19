import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TagInput from "@/components/listing/TagInput";
import type { ListingType } from "@/lib/listingFormSchema";

interface Props {
  type: ListingType;
  value: any;
  onChange: (patch: any) => void;
}

const FeesPlacementsSection = ({ type, value, onChange }: Props) => {
  if (type === "coaching") {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Discount</Label>
            <Input value={value.discount} onChange={(e) => onChange({ discount: e.target.value })} placeholder="e.g. 20% off early bird" />
          </div>
          <div>
            <Label>Featured Offer</Label>
            <Input value={value.offer} onChange={(e) => onChange({ offer: e.target.value })} placeholder="e.g. Free demo session" />
          </div>
          <div>
            <Label>Avg Course Fees (Lakhs ₹)</Label>
            <Input type="number" step="0.1" value={value.fees_lakhs || ""} onChange={(e) => onChange({ fees_lakhs: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <TagInput
          label="Key Features / Highlights"
          values={value.features || []}
          onChange={(features) => onChange({ features })}
          placeholder="e.g. Doubt clearing sessions, Mock tests"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Fees (Display)</Label>
          <Input value={value.fees} onChange={(e) => onChange({ fees: e.target.value })} placeholder="e.g. ₹23 Lakhs (2 yrs)" />
        </div>
        <div>
          <Label>Total Fees (Lakhs ₹)</Label>
          <Input type="number" step="0.1" value={value.fees_lakhs || ""} onChange={(e) => onChange({ fees_lakhs: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Average Placement</Label>
          <Input value={value.placement_avg} onChange={(e) => onChange({ placement_avg: e.target.value })} placeholder="e.g. ₹25 LPA" />
        </div>
        <div>
          <Label>Median Placement</Label>
          <Input value={value.placement_median} onChange={(e) => onChange({ placement_median: e.target.value })} placeholder="e.g. ₹22 LPA" />
        </div>
        <div>
          <Label>Highest Placement</Label>
          <Input value={value.placement_highest} onChange={(e) => onChange({ placement_highest: e.target.value })} placeholder="e.g. ₹85 LPA" />
        </div>
        <div>
          <Label>Total Students</Label>
          <Input type="number" value={value.total_students || ""} onChange={(e) => onChange({ total_students: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="md:col-span-2">
          <Label>Campus Size</Label>
          <Input value={value.campus_size} onChange={(e) => onChange({ campus_size: e.target.value })} placeholder="e.g. 102 acres" />
        </div>
      </div>
      <TagInput
        label="Top Recruiters"
        values={value.top_recruiters || []}
        onChange={(top_recruiters) => onChange({ top_recruiters })}
        placeholder="e.g. McKinsey, BCG, Bain"
      />
    </div>
  );
};

export default FeesPlacementsSection;
