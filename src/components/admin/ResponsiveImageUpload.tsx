import { Label } from "@/components/ui/label";
import { Monitor, Smartphone } from "lucide-react";
import FileUpload from "./FileUpload";

interface ImageSpec {
  dimensions: string;
  maxSize: string;
  ratio?: string;
}

interface ResponsiveImageUploadProps {
  bucket: string;
  folder: string;
  label: string;
  desktopValue: string;
  mobileValue: string;
  onDesktopChange: (url: string) => void;
  onMobileChange: (url: string) => void;
  desktopSpec: ImageSpec;
  mobileSpec: ImageSpec;
}

const ResponsiveImageUpload = ({
  bucket,
  folder,
  label,
  desktopValue,
  mobileValue,
  onDesktopChange,
  onMobileChange,
  desktopSpec,
  mobileSpec,
}: ResponsiveImageUploadProps) => {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
      <Label className="text-sm font-bold text-foreground flex items-center gap-2">
        {label}
      </Label>

      {/* Desktop Upload */}
      <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Monitor className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Desktop & Tablet</span>
          <span className="text-[10px] text-blue-500 dark:text-blue-400 ml-auto">Visible on screens ≥768px</span>
        </div>
        <FileUpload
          bucket={bucket}
          folder={`${folder}/desktop`}
          value={desktopValue}
          onChange={onDesktopChange}
          accept="image/*"
          label=""
          sizeHint={`${desktopSpec.dimensions}${desktopSpec.ratio ? ` (${desktopSpec.ratio})` : ""} • Max ${desktopSpec.maxSize}`}
          showUrlInput
        />
      </div>

      {/* Mobile Upload */}
      <div className="border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Smartphone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-300">Mobile Only</span>
          <span className="text-[10px] text-green-500 dark:text-green-400 ml-auto">Visible on screens &lt;768px</span>
        </div>
        <FileUpload
          bucket={bucket}
          folder={`${folder}/mobile`}
          value={mobileValue}
          onChange={onMobileChange}
          accept="image/*"
          label=""
          sizeHint={`${mobileSpec.dimensions}${mobileSpec.ratio ? ` (${mobileSpec.ratio})` : ""} • Max ${mobileSpec.maxSize}`}
          showUrlInput
        />
      </div>
    </div>
  );
};

export default ResponsiveImageUpload;
