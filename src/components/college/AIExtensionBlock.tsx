import { Sparkles } from "lucide-react";
import { enhanceAIContent } from "@/lib/aiContentEnhancer";

interface AIExtensionBlockProps {
  section: {
    title?: string | null;
    content?: string | null;
    data?: any;
  } | null;
  /** Friendly label for what the AI extends — e.g. "Placement Insights" */
  extensionLabel: string;
}

/**
 * Renders an AI-generated extension to a college section.
 *
 * Original content is shown first by the parent — this block appears AFTER it,
 * clearly marked as additional in-depth coverage. The original section is never
 * replaced; both are stored independently in the database.
 */
const AIExtensionBlock = ({ section, extensionLabel }: AIExtensionBlockProps) => {
  if (!section) return null;
  const html = section.content || "";
  const hasContent = html.trim().length > 0;
  if (!hasContent) return null;

  return (
    <div className="mt-6 pt-6 border-t border-dashed border-primary/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <h4 className="text-sm font-heading font-bold text-foreground">
          {extensionLabel}
        </h4>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
          Extended Insights
        </span>
      </div>
      <div
        className="ai-content max-w-none text-muted-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: enhanceAIContent(html) }}
      />
    </div>
  );
};

export default AIExtensionBlock;
