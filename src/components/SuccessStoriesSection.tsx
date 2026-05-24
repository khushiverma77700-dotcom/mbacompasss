import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cdnImage } from "@/lib/imageTransform";
import { motion } from "framer-motion";
import { Star, Quote, Award, ChevronRight, User, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const fallbackStories = [
  { name: "Priya Sharma", designation: "CAT 99.5%ile → IIM Ahmedabad", content: "The structured guidance and mock tests helped me crack CAT in my first attempt. The mentorship was invaluable.", rating: 5, image_url: null, institute: "Career Launcher" },
  { name: "Rahul Verma", designation: "XAT 98%ile → XLRI Jamshedpur", content: "Personalised coaching and extensive study material made the difference. Couldn't have done it without expert guidance.", rating: 5, image_url: null, institute: "IMS Learning" },
  { name: "Ananya Gupta", designation: "GMAT 750 → ISB Hyderabad", content: "The GMAT prep was world-class. From strategy sessions to practice tests, every aspect was covered thoroughly.", rating: 5, image_url: null, institute: "e-GMAT" },
  { name: "Vikram Singh", designation: "CAT 99.1%ile → IIM Bangalore", content: "After 2 failed attempts, the right coaching changed everything. Strategic preparation and consistent practice was key.", rating: 5, image_url: null, institute: "TIME Institute" },
];

const SuccessStoriesSection = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  
  const { data: stories } = useQuery({
    queryKey: ["success-stories-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .eq("featured", true)
        .order("sort_order", { ascending: true })
        .limit(6);
      return data && data.length > 0 ? data : fallbackStories;
    },
  });

  const items = stories || fallbackStories;

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setActiveIdx(i => (i + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  // Show 2 cards at a time on desktop
  const visibleItems = items.length > 2 
    ? [items[activeIdx], items[(activeIdx + 1) % items.length]]
    : items;

  return (
    <section className="py-16 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold mb-4">
            <Award className="w-3.5 h-3.5" /> Real Success Stories
          </span>
          <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground mb-3">
            From Aspirants to <span className="text-gradient">Achievers</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from students who transformed their MBA dreams into reality
          </p>
        </motion.div>

        <div className="relative max-w-4xl mx-auto">
          {/* Nav arrows */}
          {items.length > 2 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10 p-0 bg-card shadow-lg border border-border"
                onClick={() => setActiveIdx((activeIdx - 1 + items.length) % items.length)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10 p-0 bg-card shadow-lg border border-border"
                onClick={() => setActiveIdx((activeIdx + 1) % items.length)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleItems.map((story: any, i: number) => (
              <motion.div
                key={story.id || `story-${activeIdx}-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card rounded-2xl border border-border p-6 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <Quote className="absolute top-4 right-4 w-10 h-10 text-primary/8" />

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-primary/10">
                    {story.image_url ? (
                      <img src={story.image_url} alt={story.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-bold text-foreground">{story.name}</h3>
                    <p className="text-sm text-primary font-semibold truncate">{story.designation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: story.rating || 5 }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed mb-4 italic">
                  "{story.content}"
                </p>

                {story.institute && (
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Award className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      Coached at <span className="font-semibold text-foreground">{story.institute}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Dots */}
          {items.length > 2 && (
            <div className="flex justify-center gap-2 mt-8">
              {items.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeIdx ? "bg-primary w-6" : "bg-border"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-10">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="gap-2 rounded-full">
              Read More Stories <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SuccessStoriesSection;
