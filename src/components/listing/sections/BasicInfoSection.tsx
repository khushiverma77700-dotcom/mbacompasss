import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StateCitySelect from "@/components/admin/StateCitySelect";
import MultiSelectTags from "@/components/admin/MultiSelectTags";
import { useSpecializations } from "@/hooks/useSpecializations";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ListingType } from "@/lib/listingFormSchema";

interface Props {
  type: ListingType;
  value: any;
  onChange: (patch: any) => void;
}

const BasicInfoSection = ({ type, value, onChange }: Props) => {
  const { data: specOptions = [] } = useSpecializations(type === "college" ? "college" : "coaching");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    if (type === "coaching") {
      supabase.from("categories").select("id, name").order("name").then(({ data }) => setCategories(data || []));
    }
  }, [type]);

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Name *</Label>
          <Input value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Official institute / college name" />
        </div>

        {type === "college" && (
          <>
            <div>
              <Label>Type</Label>
              <Select value={value.type} onValueChange={(v) => onChange({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Government">Government</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="Deemed">Deemed</SelectItem>
                  <SelectItem value="Autonomous">Autonomous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier</Label>
              <Select value={value.tier} onValueChange={(v) => onChange({ tier: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Tier 1", "Tier 2", "Tier 3", "Tier 4"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={value.college_category} onValueChange={(v) => onChange({ college_category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IIM">IIM</SelectItem>
                  <SelectItem value="Non-IIM">Non-IIM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Established Year</Label>
              <Input type="number" value={value.established || ""} onChange={(e) => onChange({ established: parseInt(e.target.value) || 0 })} placeholder="e.g. 1961" />
            </div>
            <div>
              <Label>NIRF Ranking</Label>
              <Input type="number" value={value.ranking || ""} onChange={(e) => onChange({ ranking: parseInt(e.target.value) || 0 })} placeholder="e.g. 5" />
            </div>
          </>
        )}

        {type === "coaching" && (
          <>
            <div>
              <Label>Mode</Label>
              <Select value={value.mode} onValueChange={(v) => onChange({ mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Offline">Offline</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={value.category_id} onValueChange={(v) => onChange({ category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select exam category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <StateCitySelect
            state={value.state}
            city={value.city}
            onStateChange={(state) => onChange({ state, city: "" })}
            onCityChange={(city) => onChange({ city })}
          />
        </div>

        {type === "coaching" && (
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Textarea value={value.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="Full street address" rows={2} />
          </div>
        )}

        <div className="md:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Brief overview — what makes this place special, history, USPs"
            rows={5}
          />
        </div>

        <div className="md:col-span-2">
          <Label>Specializations</Label>
          <MultiSelectTags
            options={specOptions.map((s) => ({ value: s.name, label: s.name }))}
            selected={value.specializations || []}
            onChange={(specializations) => onChange({ specializations })}
            placeholder="Add specializations offered"
          />
        </div>
      </div>
    </div>
  );
};

export default BasicInfoSection;
