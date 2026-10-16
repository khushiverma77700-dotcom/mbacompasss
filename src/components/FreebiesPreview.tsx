import { useQuery } from "@tanstack/react-query";
import { homeFreebiesQuery } from "@/lib/queries/homepageQueries";
import { Link } from "@/lib/router-compat";
import { Download, FileText, Gift, ArrowRight } from "lucide-react";
import { cdnImage, cdnImageSrcSet } from "@/lib/imageTransform";


type Freebie = {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  download_count: number;
};

const FreebiesPreview = () => {
  const { data: items = [] } = useQuery(homeFreebiesQuery);

  if (!items.length) return null;

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-white via-sky-50/40 to-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Gift className="w-3.5 h-3.5" /> Free Downloads
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mt-3 text-foreground">
              Free MBA study material, PDFs & mocks
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Curated notes, formula sheets, previous-year papers & GD-PI kits — free forever.
            </p>
          </div>
          <Link
            to="/freebies"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0"
          >
            Browse all freebies <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {items.map((f) => (
            <Link
              key={f.id}
              to="/freebies"
              className="group relative rounded-2xl overflow-hidden bg-white border border-primary/10 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_15px_40px_-15px_rgba(14,165,233,0.35)] transition-all"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-sky-100 via-white to-sky-50 relative overflow-hidden">
                {f.cover_image_url ? (
                  <img
                    src={cdnImage(f.cover_image_url, { width: 360, quality: 70 })}
                    srcSet={cdnImageSrcSet(f.cover_image_url, { width: 360, quality: 70 })}
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 320px"
                    alt={f.title}
                    width={360}
                    height={270}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileText className="w-12 h-12 text-primary/40" strokeWidth={1.5} />
                  </div>
                )}
                {f.category && (
                  <span className="absolute top-2 left-2 text-xs md:text-xs font-bold uppercase tracking-wide bg-white/95 text-primary px-2 py-0.5 rounded-full ring-1 ring-primary/20">
                    {f.category}
                  </span>
                )}
              </div>
              <div className="p-3 md:p-4">
                <h3 className="text-sm md:text-sm font-bold text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">
                  {f.title}
                </h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs md:text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Download className="w-3 h-3" /> {f.download_count.toLocaleString()}
                  </span>
                  <span className="text-xs md:text-xs font-semibold text-primary group-hover:underline">
                    Download →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FreebiesPreview;
