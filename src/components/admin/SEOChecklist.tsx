import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Code, FileText, Image, Link2, Globe, Type, Hash, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SEOChecklistProps {
  data: {
    title?: string;
    slug?: string;
    h1_tag?: string;
    meta_title?: string;
    meta_description?: string;
    keywords?: string[];
    content?: string;
    excerpt?: string;
    intro?: string;
    image_url?: string;
    banner_url?: string;
    description?: string;
    // For JSON-LD validation
    schemaType?: "article" | "college" | "institute" | "exam" | "category";
    jsonLd?: Record<string, any>;
  };
  /** If true, shows a blocking warning banner when critical items fail */
  showPublishWarning?: boolean;
  onPublishBlock?: (blocked: boolean) => void;
}

interface CheckItem {
  label: string;
  category: string;
  status: "pass" | "warn" | "fail";
  tip: string;
  icon: typeof CheckCircle;
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, "").trim();
const countWords = (text: string) => stripHtml(text).split(/\s+/).filter(Boolean).length;

const hasH2H3 = (content: string) => {
  return /<h[23][^>]*>/i.test(content);
};

const hasImagesWithoutAlt = (content: string) => {
  const imgs = content.match(/<img[^>]*>/gi) || [];
  return imgs.some((img) => !img.includes("alt=") || /alt=["']\s*["']/i.test(img));
};

const hasImages = (content: string) => {
  return /<img[^>]*>/i.test(content);
};

const isSlugSeoFriendly = (slug: string) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 75;
};

const SEOChecklist = ({ data, showPublishWarning, onPublishBlock }: SEOChecklistProps) => {
  const content = data.content || data.description || "";
  const wordCount = countWords(content);

  const checks: CheckItem[] = [
    // === Content Structure ===
    {
      label: "H1 Tag",
      category: "Content Structure",
      icon: Type,
      status: data.h1_tag || data.title ? "pass" : "fail",
      tip: data.h1_tag || data.title ? `✓ "${(data.h1_tag || data.title || "").substring(0, 40)}..."` : "Add a unique H1 tag for the page",
    },
    {
      label: "H2/H3 Subheadings",
      category: "Content Structure",
      icon: List,
      status: content && hasH2H3(content) ? "pass" : content ? "warn" : "fail",
      tip: content && hasH2H3(content) ? "Subheadings found" : "Add H2/H3 subheadings for logical structure",
    },
    {
      label: "Content Length",
      category: "Content Structure",
      icon: FileText,
      status: wordCount >= 300 ? "pass" : wordCount >= 100 ? "warn" : "fail",
      tip: `${wordCount} words — ${wordCount >= 300 ? "Good length" : wordCount >= 100 ? "Consider adding more (300+ recommended)" : "Too short for SEO"}`,
    },
    {
      label: "Excerpt / Intro",
      category: "Content Structure",
      icon: FileText,
      status: data.excerpt || data.intro ? "pass" : "warn",
      tip: data.excerpt || data.intro ? "✓ Excerpt set" : "Add a short excerpt for previews & social cards",
    },

    // === Meta Data ===
    {
      label: "Meta Title",
      category: "Meta Data",
      icon: Globe,
      status: data.meta_title
        ? data.meta_title.length <= 60
          ? data.meta_title.length >= 30
            ? "pass"
            : "warn"
          : "warn"
        : "fail",
      tip: data.meta_title
        ? `${data.meta_title.length}/60 chars${data.meta_title.length > 60 ? " — Too long!" : data.meta_title.length < 30 ? " — Too short" : " ✓"}`
        : "Add a meta title (30-60 characters recommended)",
    },
    {
      label: "Meta Description",
      category: "Meta Data",
      icon: Globe,
      status: data.meta_description
        ? data.meta_description.length <= 155
          ? data.meta_description.length >= 70
            ? "pass"
            : "warn"
          : "warn"
        : "fail",
      tip: data.meta_description
        ? `${data.meta_description.length}/155 chars${data.meta_description.length > 155 ? " — Too long, may be truncated" : data.meta_description.length < 70 ? " — Too short" : " ✓"}`
        : "Add a meta description (70-155 characters recommended)",
    },
    {
      label: "Keywords",
      category: "Meta Data",
      icon: Hash,
      status: (data.keywords || []).length >= 3 ? "pass" : (data.keywords || []).length > 0 ? "warn" : "fail",
      tip: (data.keywords || []).length > 0
        ? `${(data.keywords || []).length} keywords — ${(data.keywords || []).length >= 3 ? "✓" : "Add at least 3"}`
        : "Add target keywords (3-8 recommended)",
    },

    // === URL & Technical ===
    {
      label: "SEO-Friendly URL",
      category: "Technical",
      icon: Link2,
      status: data.slug
        ? isSlugSeoFriendly(data.slug)
          ? "pass"
          : "warn"
        : "fail",
      tip: data.slug
        ? isSlugSeoFriendly(data.slug)
          ? `/${data.slug} ✓`
          : `/${data.slug} — Use lowercase, hyphens only, max 75 chars`
        : "Generate a clean URL slug",
    },

    // === Images & Media ===
    {
      label: "Featured Image",
      category: "Images & Media",
      icon: Image,
      status: data.image_url || data.banner_url ? "pass" : "warn",
      tip: data.image_url || data.banner_url
        ? "✓ Image set (used for OG/social sharing)"
        : "Add a featured image for social sharing & OG tags",
    },
    {
      label: "Image Alt Text",
      category: "Images & Media",
      icon: Image,
      status: content && hasImages(content)
        ? hasImagesWithoutAlt(content) ? "fail" : "pass"
        : "pass",
      tip: content && hasImages(content)
        ? hasImagesWithoutAlt(content) ? "Some images are missing alt text" : "✓ All images have alt text"
        : "No inline images found",
    },

    // === Structured Data ===
    {
      label: "JSON-LD Schema",
      category: "Structured Data",
      icon: Code,
      status: data.jsonLd || data.schemaType ? "pass" : "warn",
      tip: data.jsonLd || data.schemaType
        ? `✓ ${data.schemaType || "Custom"} schema configured`
        : "JSON-LD structured data will be auto-generated on the page",
    },
  ];

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const score = Math.round((passCount / checks.length) * 100);

  const criticalFails = checks.filter(
    (c) => c.status === "fail" && ["H1 Tag", "Meta Title", "Meta Description", "SEO-Friendly URL"].includes(c.label)
  );

  const isBlocked = criticalFails.length > 0;

  // Notify parent
  if (onPublishBlock) {
    onPublishBlock(isBlocked);
  }

  const categories = ["Content Structure", "Meta Data", "Technical", "Images & Media", "Structured Data"];

  const scoreColor =
    score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    : score >= 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";

  const scoreBarColor =
    score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Score Header */}
      <div className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
            SEO Score
          </h4>
          <Badge className={`${scoreColor} border-none font-bold text-base px-3 py-0.5`}>
            {score}%
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div className={`h-full ${scoreBarColor} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {passCount} passed</span>
          <span className="flex items-center gap-1 text-amber-500"><AlertCircle className="w-3 h-3" /> {warnCount} warnings</span>
          <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" /> {failCount} failed</span>
        </div>
      </div>

      {/* Publish Warning */}
      {showPublishWarning && isBlocked && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border-y border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Critical SEO items missing</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
                Fix the following before publishing: {criticalFails.map((c) => c.label).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Categorized Checks */}
      <Accordion type="multiple" defaultValue={["Content Structure", "Meta Data"]} className="border-none">
        {categories.map((cat) => {
          const catChecks = checks.filter((c) => c.category === cat);
          if (catChecks.length === 0) return null;
          const catPassed = catChecks.filter((c) => c.status === "pass").length;

          return (
            <AccordionItem key={cat} value={cat} className="border-border">
              <AccordionTrigger className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:no-underline">
                <span className="flex items-center gap-2">
                  {cat}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {catPassed}/{catChecks.length}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3 pt-0">
                <div className="space-y-1.5">
                  {catChecks.map((check) => (
                    <div key={check.label} className="flex items-start gap-2 text-xs py-1">
                      {check.status === "pass" && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />}
                      {check.status === "warn" && <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
                      {check.status === "fail" && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{check.label}</span>
                        <p className="text-muted-foreground mt-0.5 break-words">{check.tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* JSON-LD Preview */}
      {data.jsonLd && (
        <div className="px-4 pb-4">
          <details className="group">
            <summary className="text-xs font-semibold text-muted-foreground cursor-pointer flex items-center gap-1.5 py-2">
              <Code className="w-3.5 h-3.5" />
              JSON-LD Preview
            </summary>
            <pre className="mt-1 text-[10px] bg-muted/50 rounded-lg p-3 overflow-auto max-h-[200px] font-mono text-muted-foreground">
              {JSON.stringify(data.jsonLd, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default SEOChecklist;
