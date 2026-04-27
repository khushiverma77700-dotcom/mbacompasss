import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

interface T { name: string; score: string; quote: string; avatar?: string }

export function AutoTestimonialMarquee({ items }: { items: T[] }) {
  if (!items?.length) return null;
  // Duplicate for seamless loop
  const loop = [...items, ...items];
  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center">Loved by 25,000+ aspirants</h2>
        <p className="text-center text-muted-foreground mt-2">Real stories. Real scores. Real results.</p>
      </div>

      <div className="mt-10 relative">
        {/* edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-white to-transparent" />

        <div className="flex gap-4 animate-marquee hover:[animation-play-state:paused] w-max">
          {loop.map((t, i) => (
            <Card key={i} className="p-5 w-[320px] shrink-0 border-sky-100 bg-white shadow-sm">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
              <div className="mt-3 pt-3 border-t flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-sm">
                  {t.name?.charAt(0) || "?"}
                </div>
                <div>
                  <div className="font-semibold text-sm leading-tight">{t.name}</div>
                  <div className="text-xs text-sky-700 font-medium">{t.score}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
