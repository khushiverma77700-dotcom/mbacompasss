import { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

/** Friendly empty-state block for student dashboard sections. */
export default function EmptyState({ title, description, icon, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-xl border border-dashed border-border bg-card/50">
      <div className="h-12 w-12 grid place-items-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 mb-3">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
