import { Link } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Calculator, ArrowRight } from "lucide-react";
import { WHATSAPP_GROUP_URL } from "@/lib/whatsapp";
import whatsappLogo from "@/assets/whatsapp-logo.png";

const tools = [
  {
    to: "/profile-analyzer",
    icon: Sparkles,
    title: "AI Profile Analyzer",
    description: "Get an instant score on your MBA profile with improvement areas.",
  },
  {
    to: "/roi-calculator",
    icon: Calculator,
    title: "AI ROI Calculator",
    description: "Compare fees, salary and payback period before you commit.",
  },
];

const GuidanceSuccessDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md text-center p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
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
          Join our WhatsApp community for:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Student updates</li>
          <li>MBA references</li>
          <li>Important information</li>
          <li>Further support</li>
        </ul>
      </div>

      <Button
        asChild
        className="w-full min-h-12 text-white hover:opacity-90 border-0"
        style={{ backgroundColor: "#25D366" }}
      >
        <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer">
          <img
            src={whatsappLogo}
            alt="WhatsApp logo"
            width={512}
            height={512}
            loading="lazy"
            className="w-7 h-7 mr-2.5"
          />
          Join Our WhatsApp Group
        </a>
      </Button>

      <div className="text-left">
        <p className="text-xs font-medium text-muted-foreground mb-2">Meanwhile, try our free AI tools:</p>
        <div className="flex gap-2">
          {tools.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              onClick={() => onOpenChange(false)}
              className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/60"
            >
              <span className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <tool.icon className="w-3.5 h-3.5 text-primary" />
              </span>
              <span className="min-w-0 text-left">
                <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  {tool.title} <ArrowRight className="w-3 h-3 text-primary" />
                </span>
                <span className="block text-[11px] leading-tight text-muted-foreground mt-0.5 line-clamp-2">
                  {tool.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Button variant="ghost" className="w-full min-h-11" onClick={() => onOpenChange(false)}>
        Maybe Later
      </Button>
    </DialogContent>
  </Dialog>
);

export default GuidanceSuccessDialog;
