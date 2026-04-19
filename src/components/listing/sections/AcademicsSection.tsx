import TagInput from "@/components/listing/TagInput";

interface Props {
  value: any;
  onChange: (patch: any) => void;
}

const AcademicsSection = ({ value, onChange }: Props) => {
  return (
    <div className="space-y-5">
      <TagInput
        label="Courses Offered"
        values={value.courses || []}
        onChange={(courses) => onChange({ courses })}
        placeholder="e.g. PGP, MBA, EPGP"
        hint="Add programs offered, press Enter after each."
      />
      <TagInput
        label="Exams Accepted"
        values={value.exams_accepted || []}
        onChange={(exams_accepted) => onChange({ exams_accepted })}
        placeholder="e.g. CAT, XAT, GMAT"
      />
      <TagInput
        label="Accreditations"
        values={value.accreditations || []}
        onChange={(accreditations) => onChange({ accreditations })}
        placeholder="e.g. AACSB, AICTE, NAAC A++"
      />
    </div>
  );
};

export default AcademicsSection;
