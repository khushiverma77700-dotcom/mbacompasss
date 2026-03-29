import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, Quote, Award, ChevronRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const fallbackStories = [
  { name: "Priya Sharma", designation: "CAT 99.5%ile → IIM Ahmedabad", content: "The structured guidance and mock tests helped me crack CAT in my first attempt. The mentorship was invaluable.", rating: 5, image_url: null, institute: "Career Launcher" },
  { name: "Rahul Verma", designation: "XAT 98%ile → XLRI Jamshedpur", content: "Personalised coaching and extensive study material made the difference. Couldn't have done it without expert guidance.", rating: 5, image_url: null, institute: "IMS Learning" },
  { name: "Ananya Gupta", designation: "GMAT 750 → ISB Hyderabad", content: "The GMAT prep was world-class. From strategy sessions to practice tests, every aspect was covered thoroughly.", rating: 5, image_url: null, institute: "e-GMAT" },
  { name: "Vikram Singh", designation: "CAT 99.1%ile → IIM Bangalore", content: "After 2 failed attempts, the right coaching changed everything. Strategic preparation and consistent practice was key.", rating: 5, image_url: null, institute: "TIME Institute" },
];

const SuccessStoriesSection = () => {
  const { data: stories } = useQuery({
    queryKey: ["success-stories-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .eq("featured", true)
        .order("sort_order", { ascending: true })
        .limit(4);
      return data && data.length > 0 ? data : fallbackStories;
    },
  });

  const items = stories || fallbackStories;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Real Success Stories</span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
            From Aspirants to Achievers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from students who transformed their MBA dreams into reality with the right coaching and dedicated preparation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((story: any, i: number) => (
            <motion.div
              key={story.id || i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border p-6 relative overflow-hidden"
            >
              <Quote className="absolute top-4 right-4 w-10 h-10 text-primary/10" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {story.image_url ? (
                    <img src={story.image_url} alt={story.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground">{story.name}</h3>
                  <p className="text-sm text-primary font-medium truncate">{story.designation}</p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: story.rating || 5 }).map((_, si) => (
                  <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                "{story.content}"
              </p>

              {story.institute && (
                <p className="text-xs text-muted-foreground">
                  Coached at <span className="font-medium text-foreground">{story.institute}</span>
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/blog">
            <Button variant="outline" size="lg" className="gap-2">
              Read More Stories <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SuccessStoriesSection;
