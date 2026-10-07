import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { enqueueImageOptimization } from "@/lib/enqueueImageOptimization";
import { isPrivateBucket, useSignedStorageUrl } from "@/lib/privateStorage";

interface FileUploadProps {
  bucket: string;
  folder?: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  label?: string;
  showUrlInput?: boolean;
  sizeHint?: string;
  expectedSize?: { width: number; height: number };
}

const FileUpload = ({ bucket, folder = "", value, onChange, accept = "*", label = "Upload File", showUrlInput = true, sizeHint, expectedSize }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const privateBucket = isPrivateBucket(bucket);
  const previewUrl = useSignedStorageUrl(bucket, value);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (expectedSize) {
        const objectUrl = URL.createObjectURL(file);
        try {
          const image = new Image(); image.src = objectUrl;
          await image.decode();
          if (image.naturalWidth !== expectedSize.width || image.naturalHeight !== expectedSize.height) {
            throw new Error(`This format needs ${expectedSize.width} × ${expectedSize.height}px. Your image is ${image.naturalWidth} × ${image.naturalHeight}px.`);
          }
        } finally { URL.revokeObjectURL(objectUrl); }
      }
      const ext = file.name.split(".").pop();
      let prefix = folder ? `${folder}/` : "";

      if (privateBucket) {
        // Private buckets enforce owner-scoped folders in their access rules.
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData.user?.id;
        if (!uid) throw new Error("Please sign in before uploading files.");
        prefix = `${uid}/${prefix}`;
      }

      const fileName = `${prefix}${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) throw error;

      if (privateBucket) {
        // Store the object path only; display code signs it on demand.
        onChange(fileName);
      } else {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        onChange(urlData.publicUrl);
        // Automatic image SEO pipeline — non-blocking
        if (file.type.startsWith("image/")) {
          enqueueImageOptimization(urlData.publicUrl);
        }
      }
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
        <p className="text-xs text-muted-foreground/70 -mt-1 flex items-center gap-1">
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
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-[0.25rem]">
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
      {previewUrl && accept?.includes("image") && (
        <img src={previewUrl} alt="Preview" className="h-20 w-auto rounded-[0.25rem] border border-border object-cover"  loading="lazy" decoding="async" />
      )}
    </div>
  );
};

export default FileUpload;
