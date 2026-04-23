import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { profileId?: string }

export const ShareReportButton = ({ profileId }: Props) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  if (!profileId) return null;

  const url = `${window.location.origin}/report/${profileId}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "My MBA Profile Report — B School Buzz", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied", description: "Share your read-only report with mentors or peers." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[share]", err);
    }
  };

  return (
    <Button onClick={handleShare} variant="outline" className="rounded-xl">
      {copied ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : navigator.share ? <Share2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      {copied ? "Link copied" : "Share Report"}
    </Button>
  );
};

export default ShareReportButton;
