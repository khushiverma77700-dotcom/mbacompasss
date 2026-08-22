import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { WHATSAPP_GROUP_URL } from "@/lib/whatsapp";

const GuidanceSuccessDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md text-center p-6 sm:p-8">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mt-4">
        Hi, Thank You for Submitting!
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        We have received your free MBA guidance request successfully. Our team will reach out to
        you shortly.
      </p>
      <div className="rounded-xl border border-border bg-muted/40 p-4 text-left">
        <p className="text-sm font-semibold text-foreground mb-2">
          In the meantime, join our WhatsApp community for:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Student updates</li>
          <li>MBA references</li>
          <li>Important information</li>
          <li>Further support</li>
        </ul>
      </div>
      <div className="space-y-2 mt-1">
        <Button asChild className="w-full min-h-11">
          <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-2" /> Join Our WhatsApp Group
          </a>
        </Button>
        <Button variant="ghost" className="w-full min-h-11" onClick={() => onOpenChange(false)}>
          Maybe Later
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default GuidanceSuccessDialog;
