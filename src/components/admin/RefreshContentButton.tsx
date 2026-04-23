import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Sparkles, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  entityType: "article" | "college" | "institute" | "course";
  entityId: string;
  entityName?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
}

export function RefreshContentButton({ entityType, entityId, entityName, size = "sm", variant = "outline" }: Props) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const trigger = async (mode: "smart" | "full") => {
    if (!entityId) {
      toast({ title: "Save the record first", description: "Cannot refresh content for an unsaved entity.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("refresh-content", {
        body: { entity_type: entityType, entity_id: entityId, mode, requested_by: user?.id },
      });
      if (error) throw error;
      const changed = (data as any)?.changed_fields ?? 0;
      const total = (data as any)?.total_fields ?? 0;
      toast({
        title: "Refresh ready for review",
        description: `${entityName || "Entity"}: ${changed}/${total} fields proposed for update. Open the review queue.`,
      });
      navigate("/admin/content-refreshes");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start refresh";
      toast({ title: "Refresh failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh Content
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>AI re-research & update</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => trigger("smart")} className="flex-col items-start gap-1 cursor-pointer">
          <div className="flex items-center gap-2 font-medium">
            <Target className="h-4 w-4 text-primary" />
            Smart refresh (recommended)
          </div>
          <span className="text-xs text-muted-foreground pl-6">
            Updates only fees, placements, rankings, dates & citations. Keeps tone.
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => trigger("full")} className="flex-col items-start gap-1 cursor-pointer">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Full content rewrite
          </div>
          <span className="text-xs text-muted-foreground pl-6">
            Re-writes everything from scratch with the latest verified data.
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default RefreshContentButton;
