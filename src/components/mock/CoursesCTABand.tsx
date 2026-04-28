import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, CheckCircle2, ShoppingBag } from "lucide-react";

interface CoursesCTABlock {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_url?: string;
  secondary_label?: string;
  highlights?: string[];
}

type Variant = "compact" | "full" | "inline";

export default function CoursesCTABand({
  block,
  variant = "full",
}: {
  block?: CoursesCTABlock;
  variant?: Variant;
}) {
  if (block && block.enabled === false) return null;
  const url = block?.cta_url ?? "/courses";
  const label = block?.cta_label ?? "Browse all courses";

  if (variant === "inline") {
    return (
      <div className="container mx-auto px-4">
        <div className="rounded-2xl border-2 border-dashed border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50 p-5 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="font-semibold">Looking for full bundles?</div>
            <div className="text-sm text-muted-foreground">CAT, XAT, NMAT, SNAP — pick a curated bundle and unlock every mock instantly.</div>
          </div>
          <Button asChild size="lg" className="shadow-md shadow-sky-500/30">
            <Link to={url}>
              {label} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <section className="py-10 bg-white">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-sky-700 text-white p-6 md:p-8 flex flex-col md:flex-row items-center gap-5 md:gap-8 shadow-xl shadow-sky-500/20">
            <ShoppingBag className="h-10 w-10 md:h-12 md:w-12 text-sky-100 shrink-0" />
            <div className="flex-1 text-center md:text-left">
              <div className="text-xs uppercase tracking-wider text-sky-100/90">{block?.eyebrow ?? "Mock Bundles & Courses"}</div>
              <div className="text-xl md:text-2xl font-bold mt-1">{block?.title ?? "Save more with curated mock bundles"}</div>
            </div>
            <Button asChild size="lg" variant="secondary" className="bg-white text-sky-700 hover:bg-sky-50">
              <Link to={url}>
                {label} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // FULL
  return (
    <section className="py-16 bg-gradient-to-b from-white via-sky-50/40 to-white">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
            <Package className="h-3.5 w-3.5 mr-1" /> {block?.eyebrow ?? "Mock Bundles & Courses"}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold">{block?.title ?? "Save more with curated mock bundles"}</h2>
          <p className="text-muted-foreground mt-3">{block?.subtitle}</p>
        </div>

        {block?.highlights && block.highlights.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
            {block.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm font-medium">{h}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="shadow-lg shadow-sky-500/30 text-base px-8">
            <Link to={url}>
              {label} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          {block?.secondary_label && (
            <Button asChild size="lg" variant="outline">
              <Link to={url}>{block.secondary_label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
