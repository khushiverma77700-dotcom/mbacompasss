import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { newsItems } from "@/data/mockData";

const BlogPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
            MBA Blog & Exam Tips
          </h1>
          <p className="text-primary-foreground/70">Stay updated with the latest MBA exam news and preparation strategies</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {newsItems.map((item) => (
            <article
              key={item.id}
              className="bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 border border-border group cursor-pointer"
            >
              <div className="h-36 hero-gradient flex items-center justify-center">
                <span className="font-heading font-bold text-primary-foreground opacity-60">{item.category}</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {item.date}
                  </span>
                </div>
                <h2 className="font-heading font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h2>
                <p className="text-sm text-muted-foreground">{item.excerpt}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
