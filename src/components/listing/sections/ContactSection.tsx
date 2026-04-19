import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ListingType } from "@/lib/listingFormSchema";

interface Props {
  type: ListingType;
  value: any;
  onChange: (patch: any) => void;
}

const ContactSection = ({ type, value, onChange }: Props) => {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label>Website</Label>
        <Input value={value.website} onChange={(e) => onChange({ website: e.target.value })} placeholder="https://www.example.com" />
      </div>
      {type === "coaching" && (
        <>
          <div>
            <Label>Email</Label>
            <Input type="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} placeholder="contact@institute.com" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} placeholder="+91 XXXXXXXXXX" />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={value.whatsapp} onChange={(e) => onChange({ whatsapp: e.target.value })} placeholder="10-digit WhatsApp" />
          </div>
        </>
      )}
      {type === "college" && (
        <div className="md:col-span-2">
          <Label>Admission Process</Label>
          <Textarea
            value={value.admission_process}
            onChange={(e) => onChange({ admission_process: e.target.value })}
            placeholder="Describe the admission steps, deadlines, required scores"
            rows={4}
          />
        </div>
      )}
    </div>
  );
};

export default ContactSection;
