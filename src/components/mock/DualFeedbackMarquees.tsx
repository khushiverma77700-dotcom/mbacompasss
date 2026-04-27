import { Card } from "@/components/ui/card";
import { Star, Quote, MessageCircle } from "lucide-react";

interface TextItem { name: string; tag?: string; quote: string; avatar?: string }
interface ImgItem { image_url: string; caption?: string }

export function DualFeedbackMarquees({
  textItems = [],
  imageItems = [],
}: {
  textItems?: TextItem[];
  imageItems?: ImgItem[];
}) {
  if (textItems.length === 0 && imageItems.length === 0) return null;
  const textLoop = [...textItems, ...textItems];
  const imgLoop = [...imageItems, ...imageItems];

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold">What aspirants are saying</h2>
          <p className="text-muted-foreground mt-2">Real, unfiltered feedback from our community.</p>
        </div>
      </div>

      {/* TEXT — Right to Left */}
      {textItems.length > 0 && (
        <div className="mt-10 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-white to-transparent" />
          <div className="flex gap-4 animate-marquee hover:[animation-play-state:paused] w-max">
            {textLoop.map((t, i) => (
              <Card key={i} className="p-5 w-[340px] shrink-0 border-sky-100 bg-white shadow-sm relative">
                <Quote className="absolute top-3 right-3 h-7 w-7 text-sky-100" />
                <div className="flex gap-0.5 mb-2">
                  {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
                <div className="mt-3 pt-3 border-t flex items-center gap-3">
                  {t.avatar ? (
                    <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                      {t.name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-sm leading-tight">{t.name}</div>
                    <div className="text-xs text-sky-700 font-medium">{t.tag}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* IMAGES — Left to Right */}
      {imageItems.length > 0 && (
        <div className="mt-6 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-white to-transparent" />
          <div className="flex gap-4 animate-marquee-reverse hover:[animation-play-state:paused] w-max">
            {imgLoop.map((img, i) => (
              <Card key={i} className="w-[260px] shrink-0 overflow-hidden border-sky-100 bg-white shadow-sm">
                <div className="aspect-[4/5] bg-sky-50 flex items-center justify-center">
                  {img.image_url ? (
                    <img src={img.image_url} alt={img.caption || "feedback"} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <MessageCircle className="h-10 w-10 text-sky-300" />
                  )}
                </div>
                {img.caption && <div className="p-2.5 text-xs text-center text-muted-foreground">{img.caption}</div>}
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
