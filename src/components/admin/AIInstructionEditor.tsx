import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wand2, Loader2, Sparkles } from "lucide-react";
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

const QUICK_PROMPTS = [
  "Make the intro more conversational and engaging",
  "Add 2025 NIRF ranking and latest placement stats with citations",
  "Interlink other top IIMs/colleges wherever they are mentioned",
  "Fix any 'N/A' or 'Contact for details' with realistic values",
  "Improve formatting: add subheadings, bullet lists and a key-facts table",
  "Refresh meta title & description for SEO (2025, max 60/160 chars)",
];

export function AIInstructionEditor({ entityType, entityId, entityName, size = "sm", variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    if (!entityId) {
      toast({ title: "Save the record first", description: "Cannot edit an unsaved entity.", variant: "destructive" });
      return;
    }
    if (!instruction.trim() || instruction.trim().length < 8) {
      toast({ title: "Tell the AI what to do", description: "Write a short instruction (e.g. 'Add 2025 placement stats').", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke("ai-edit-content", {
        body: {
          entity_type: entityType,
          entity_id: entityId,
          instruction: instruction.trim(),
          requested_by: user?.id,
        },
      });
      if (error) throw error;
      const changed = (data as any)?.changed_fields ?? 0;
      const total = (data as any)?.total_fields ?? 0;
      toast({
        title: "AI edit ready for review",
        description: `${entityName || "Entity"}: ${changed}/${total} fields proposed. Open the review queue to approve.`,
      });
      setOpen(false);
      setInstruction("");
      navigate("/admin/content-refreshes");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI edit failed";
      toast({ title: "AI edit failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="gap-2" disabled={!entityId}>
          <Wand2 className="h-4 w-4" />
          AI Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Edit with Instruction
          </DialogTitle>
          <DialogDescription>
            Tell the AI exactly what to change on{" "}
            <span className="font-medium text-foreground">{entityName || "this entity"}</span>.
            The AI will only touch what you ask. Changes go to the review queue for your approval before going live.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="ai-instruction" className="text-sm font-medium">
              Your instruction
            </Label>
            <Textarea
              id="ai-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Update placement section with 2025 stats and link IIM-A and IIM-B wherever mentioned"
              className="mt-1.5 min-h-[120px] resize-y"
              disabled={loading}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Tip: be specific. Mention the section, fact, link, or tone change you want.
            </p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Quick prompts</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <Badge
                  key={p}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/10 hover:text-primary transition font-normal"
                  onClick={() => setInstruction(p)}
                >
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "AI is editing…" : "Generate Edit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AIInstructionEditor;
