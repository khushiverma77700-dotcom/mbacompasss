import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Copy, ExternalLink, Mail, Lock, LinkIcon, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  courseName: string;
  amount?: number;
  dashboardLink?: string;
}

const copy = (v: string, label: string) => {
  navigator.clipboard.writeText(v).then(() => toast.success(`${label} copied`));
};

export default function PurchaseSuccessDialog({
  open, onOpenChange, email, courseName, amount, dashboardLink = "https://dashboard.mbacompass.in",
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogTitle className="text-center text-xl">Payment Successful!</DialogTitle>
          <DialogDescription className="text-center">
            We've also emailed these details to <span className="font-medium text-foreground">{email}</span>.
          </DialogDescription>
        </DialogHeader>

        <Card className="p-4 space-y-3 bg-sky-50/50 border-sky-100">
          <Row icon={BookOpen} label="Course" value={courseName} />
          {amount != null && <Row icon={CheckCircle2} label="Amount Paid" value={`₹${Number(amount).toLocaleString()}`} />}
          <Row icon={Mail} label="Login ID" value={email} onCopy={() => copy(email, "Login ID")} />
          <Row icon={Lock} label="Password" value="Use your existing password" muted />
          <Row icon={LinkIcon} label="Dashboard" value={dashboardLink} onCopy={() => copy(dashboardLink, "Dashboard link")} link />
        </Card>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button variant="outline" asChild>
            <a href={dashboardLink} target="_blank" rel="noopener noreferrer">
              Open Dashboard <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </a>
          </Button>
          <Button asChild>
            <Link to="/student/mocks">My Mocks <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-1">
          Forgot your password? <Link to="/forgot-password" className="text-primary hover:underline">Reset via OTP</Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value, onCopy, link, muted }: { icon: any; label: string; value: string; onCopy?: () => void; link?: boolean; muted?: boolean; }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-sky-600 mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-sm font-medium break-all ${muted ? "text-muted-foreground" : ""}`}>
          {link ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">{value}</a> : value}
        </div>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="text-muted-foreground hover:text-foreground p-1" aria-label="Copy">
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
