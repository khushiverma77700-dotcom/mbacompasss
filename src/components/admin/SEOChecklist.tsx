import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
    image_url?: string;
    banner_url?: string;
  };
}

interface CheckItem {
  label: string;
  status: "pass" | "warn" | "fail";
  tip: string;
}

const SEOChecklist = ({ data }: SEOChecklistProps) => {
  const checks: CheckItem[] = [
    {
      label: "Meta Title",
      status: data.meta_title ? (data.meta_title.length <= 60 ? "pass" : "warn") : "fail",
      tip: data.meta_title ? (data.meta_title.length > 60 ? `Too long (${data.meta_title.length}/60 chars)` : `${data.meta_title.length}/60 chars`) : "Add a meta title (max 60 chars)",
    },
    {
      label: "Meta Description",
      status: data.meta_description ? (data.meta_description.length <= 160 ? "pass" : "warn") : "fail",
      tip: data.meta_description ? (data.meta_description.length > 160 ? `Too long (${data.meta_description.length}/160)` : `${data.meta_description.length}/160 chars`) : "Add a meta description (max 160 chars)",
    },
    {
      label: "H1 Tag",
      status: data.h1_tag || data.title ? "pass" : "fail",
      tip: data.h1_tag || data.title ? "H1 set" : "Set an H1 tag for the page",
    },
    {
      label: "URL Slug",
      status: data.slug ? (data.slug.length <= 75 ? "pass" : "warn") : "fail",
      tip: data.slug ? `/${data.slug}` : "Generate a clean URL slug",
    },
    {
      label: "Keywords",
      status: (data.keywords || []).length > 0 ? ((data.keywords || []).length >= 3 ? "pass" : "warn") : "fail",
      tip: (data.keywords || []).length > 0 ? `${(data.keywords || []).length} keywords set` : "Add target keywords (min 3 recommended)",
    },
    {
      label: "Content Length",
      status: (data.content || "").length > 300 ? "pass" : (data.content || "").length > 100 ? "warn" : "fail",
      tip: `${(data.content || "").length} chars — ${(data.content || "").length > 300 ? "Good" : "Add more content for better SEO"}`,
    },
    {
      label: "Excerpt / Intro",
      status: data.excerpt ? "pass" : "warn",
      tip: data.excerpt ? "Excerpt set" : "Add a short excerpt for previews",
    },
    {
      label: "Featured Image",
      status: data.image_url || data.banner_url ? "pass" : "warn",
      tip: data.image_url || data.banner_url ? "Image set" : "Add a featured image for social sharing",
    },
  ];

  const passCount = checks.filter(c => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100);

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-semibold text-foreground text-sm">SEO Score</h4>
        <Badge className={`${score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : score >= 50 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"} border-none font-bold`}>
          {score}%
        </Badge>
      </div>
      <div className="space-y-1.5">
        {checks.map(check => (
          <div key={check.label} className="flex items-center gap-2 text-xs">
            {check.status === "pass" && <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
            {check.status === "warn" && <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            {check.status === "fail" && <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
            <span className="font-medium text-foreground">{check.label}</span>
            <span className="text-muted-foreground ml-auto">{check.tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SEOChecklist;
