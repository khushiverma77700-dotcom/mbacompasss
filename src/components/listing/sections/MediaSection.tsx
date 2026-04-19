import FileUpload from "@/components/admin/FileUpload";

interface Props {
  value: any;
  onChange: (patch: any) => void;
}

const MediaSection = ({ value, onChange }: Props) => {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="border border-border rounded-xl p-4 bg-muted/30">
        <FileUpload
          bucket="listing-uploads"
          folder="logos"
          value={value.logo_url}
          onChange={(url) => onChange({ logo_url: url })}
          accept="image/*"
          label="Logo"
          sizeHint="200x200px (square) • Max 1MB"
        />
      </div>
      <div className="border border-border rounded-xl p-4 bg-muted/30">
        <FileUpload
          bucket="listing-uploads"
          folder="banners"
          value={value.banner_url}
          onChange={(url) => onChange({ banner_url: url })}
          accept="image/*"
          label="Banner Image"
          sizeHint="1920x600px (16:5) • Max 2MB"
        />
      </div>
    </div>
  );
};

export default MediaSection;
