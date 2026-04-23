import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileCheck } from "lucide-react";
import FullPageReauditDialog from "@/components/admin/FullPageReauditDialog";

interface Props {
  kind: "college" | "institute";
  entityId: string;
  entityName: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary" | "ghost";
}

/** Trigger that opens the full-page re-audit dialog for a college or institute. */
export const FullPageReauditButton = ({ kind, entityId, entityName, size = "sm", variant = "outline" }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        variant={variant}
        className="gap-2"
        onClick={() => setOpen(true)}
        title="Re-audit the full page (parent + sections) and apply unified SEO"
      >
        <FileCheck className="h-4 w-4" />
        Re-audit Full Page
      </Button>
      <FullPageReauditDialog
        kind={kind}
        entityId={entityId}
        entityName={entityName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
};

export default FullPageReauditButton;
