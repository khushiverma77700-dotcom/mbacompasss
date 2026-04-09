import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  bucket: string;
  folder?: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  label?: string;
  showUrlInput?: boolean;
  sizeHint?: string;
}

const FileUpload = ({ bucket, folder = "", value, onChange, accept = "*", label = "Upload File", showUrlInput = true, sizeHint }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast({ title: "File uploaded successfully" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground block">{label}</Label>
      {sizeHint && (
        <p className="text-[10px] text-muted-foreground/70 -mt-1 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/50" />
          Recommended: {sizeHint}
        </p>
      )}
      <div className="flex gap-2 items-center">
        <input ref={fileRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        {value && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            <FileText className="w-3 h-3" />
            <span className="max-w-[200px] truncate">{value.split("/").pop()}</span>
            <button onClick={() => onChange("")} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      {showUrlInput && (
        <Input
          placeholder="Or paste URL directly"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      )}
      {value && accept?.includes("image") && (
        <img src={value} alt="Preview" className="h-20 w-auto rounded border border-border object-cover" />
      )}
    </div>
  );
};

export default FileUpload;
