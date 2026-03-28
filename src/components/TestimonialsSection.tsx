import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const TestimonialsSection = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState<"all" | "text" | "image" | "video">("all");
  const intervalRef = useRef<NodeJS.Timeout>();

  const { data: testimonials = [] } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const filtered = filter === "all" ? testimonials : testimonials.filter((t: any) => t.type === filter);

  useEffect(() => {
    if (filtered.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % filtered.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [filtered.length, filter]);

  useEffect(() => { setActiveIdx(0); }, [filter]);

  if (testimonials.length === 0) return null;

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s?]+)/);
    return match?.[1];
  };

  const current = filtered[activeIdx];

  return (
    <section className="py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
            What Our Students Say
          </h2>
          <p className="text-muted-foreground mb-6">Real stories from real students</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {["all", "text", "image", "video"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f as any)}
                className="capitalize"
              >
                {f === "all" ? "All" : f === "text" ? "Text" : f === "image" ? "Screenshots" : "Videos"}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No testimonials in this category yet.</p>
        )}

        {filtered.length > 0 && (
          <div className="relative max-w-4xl mx-auto">
            {/* Navigation arrows */}
            {filtered.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 rounded-full w-10 h-10 p-0 bg-card shadow-md border border-border"
                  onClick={() => { setActiveIdx((activeIdx - 1 + filtered.length) % filtered.length); }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 rounded-full w-10 h-10 p-0 bg-card shadow-md border border-border"
                  onClick={() => { setActiveIdx((activeIdx + 1) % filtered.length); }}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.35 }}
                  className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
                >
                  {current.type === "text" && (
                    <div className="p-8 md:p-10">
                      <Quote className="w-8 h-8 text-primary/30 mb-4" />
                      <p className="text-foreground text-lg leading-relaxed mb-6">{current.content}</p>
                      <div className="flex items-center gap-4">
                        {current.image_url && (
                          <img src={current.image_url} alt={current.name} className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div>
                          <p className="font-heading font-semibold text-foreground">{current.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {current.designation}{current.institute ? ` • ${current.institute}` : ""}
                          </p>
                        </div>
                        <div className="ml-auto flex gap-0.5">
                          {Array.from({ length: current.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {current.type === "image" && (
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-1/2">
                        <img src={current.image_url} alt={current.name} className="w-full h-full object-cover max-h-[400px]" />
                      </div>
                      <div className="md:w-1/2 p-6 flex flex-col justify-center">
                        <p className="font-heading font-semibold text-foreground text-lg mb-1">{current.name}</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          {current.designation}{current.institute ? ` • ${current.institute}` : ""}
                        </p>
                        {current.content && <p className="text-muted-foreground text-sm">{current.content}</p>}
                        <div className="flex gap-0.5 mt-3">
                          {Array.from({ length: current.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {current.type === "video" && (
                    <div>
                      {current.video_url && getYouTubeId(current.video_url) ? (
                        <div className="aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeId(current.video_url)}`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <Play className="w-16 h-16 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-4">
                        <p className="font-heading font-semibold text-foreground">{current.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {current.designation}{current.institute ? ` • ${current.institute}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dots */}
            {filtered.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {filtered.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === activeIdx ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
