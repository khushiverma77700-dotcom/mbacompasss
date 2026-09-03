import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

interface Props {
  value: string;
  folder: string;
  /** Uploads through the magic-edit edge function and returns the public URL. */
  upload: (dataUrl: string, folder: string) => Promise<string>;
  onChange: (url: string) => void;
  hint?: string;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read that file."));
    r.readAsDataURL(file);
  });

const MagicImageUpload = ({ value, folder, upload, onChange, hint }: Props) => {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await upload(await readAsDataUrl(file), folder);
      onChange(url);
      toast({ title: "Image uploaded", description: "Remember to publish your changes." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()} className="gap-1.5">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {busy ? "Uploading…" : "Upload image"}
        </Button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-sm text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>
      <Input placeholder="Or paste an image URL" value={value || ""} onChange={(e) => onChange(e.target.value)} className="text-sm" />
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {value && (
        <img src={value} alt="Preview" className="h-24 w-auto rounded-[0.25rem] border border-border object-contain bg-muted" loading="lazy" decoding="async" />
      )}
    </div>
  );
};

export default MagicImageUpload;
