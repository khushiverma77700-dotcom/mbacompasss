import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";

const SUPPORT_PHONE = "+919876543210";
const SUPPORT_EMAIL = "support@mbacompass.in";

export default function UpgradeDialog({
  open,
  onOpenChange,
  featureLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  featureLabel?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade your course</DialogTitle>
          <DialogDescription>
            {featureLabel
              ? <>Access to <strong>{featureLabel}</strong> is not included in your current plan.</>
              : <>This feature is not included in your current plan.</>}
            {" "}Talk to our team to add it on or move to a richer course.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 transition"
          >
            <div className="h-10 w-10 rounded-full bg-sky-500 grid place-items-center text-white">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Call our advisor</div>
              <div className="text-xs text-muted-foreground">{SUPPORT_PHONE}</div>
            </div>
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Upgrade request${featureLabel ? ` — ${featureLabel}` : ""}`)}`}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-sky-200 hover:bg-sky-50 transition"
          >
            <div className="h-10 w-10 rounded-full bg-blue-500 grid place-items-center text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">Email support</div>
              <div className="text-xs text-muted-foreground">{SUPPORT_EMAIL}</div>
            </div>
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useUpgradeDialog() {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<string | undefined>();
  const trigger = (featureLabel?: string) => { setFeature(featureLabel); setOpen(true); };
  const dialog = <UpgradeDialog open={open} onOpenChange={setOpen} featureLabel={feature} />;
  return { trigger, dialog };
}
