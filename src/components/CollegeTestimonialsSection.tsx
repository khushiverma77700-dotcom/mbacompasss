import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star, Quote } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const CollegeTestimonialsSection = () => {
  const [activeIdx, setActiveIdx] = useState(0);

  const { data: testimonials } = useQuery({
    queryKey: ["college-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*, institutes(name, logo_url)")
        .eq("active", true)
        .not("institute_id", "is", null)
        .order("sort_order")
        .limit(12);
      return data || [];
    },
  });

  useEffect(() => {
    if (!testimonials?.length) return;
    const timer = setInterval(() => setActiveIdx((i) => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(timer);
  }, [testimonials]);

  if (!testimonials?.length) return null;

  const current = testimonials[activeIdx];

  return (
    <section className="py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-2">What Students Say About Our Institutes</h2>
          <p className="text-muted-foreground">Real reviews from verified students</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="bg-card rounded-2xl border border-border p-8 shadow-lg relative"
          >
            <Quote className="w-10 h-10 text-primary/20 absolute top-6 right-6" />
            <div className="flex items-center gap-4 mb-4">
              {current.image_url ? (
                <img src={current.image_url} alt={current.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {current.name?.[0]}
                </div>
              )}
              <div>
                <h4 className="font-semibold text-foreground">{current.name}</h4>
                <p className="text-sm text-muted-foreground">{current.designation}</p>
                {(current as any).institutes?.name && (
                  <p className="text-xs text-primary font-medium">{(current as any).institutes.name}</p>
                )}
              </div>
              {current.rating && (
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: current.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
              )}
            </div>
            {current.content && (
              <p className="text-muted-foreground leading-relaxed italic">"{current.content}"</p>
            )}
          </motion.div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === activeIdx ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollegeTestimonialsSection;
