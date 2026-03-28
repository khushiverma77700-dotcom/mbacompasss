import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { newsItems } from "@/data/mockData";

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const blogCategories = ["all", ...new Set(newsItems.map((n) => n.category))];

  useEffect(() => {
    document.title = "MBA Blog - Exam Tips, News & Career Advice | MBAHub";
  }, []);

  const filtered = selectedCategory === "all" ? newsItems : newsItems.filter((n) => n.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">MBA Blog & News</h1>
          <p className="text-primary-foreground/70">Exam tips, career advice, coaching reviews, and the latest MBA news</p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 flex-wrap mb-8">
          {blogCategories.map((cat) => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary border border-border"}`}>
              {cat === "all" ? "All Articles" : cat}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, i) => (
            <motion.article key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/article/${item.id}`} className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 border border-border h-full">
                <div className="h-36 hero-gradient flex items-center justify-center">
                  <span className="font-heading font-bold text-primary-foreground text-sm opacity-60">{item.category}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.date}</span>
                    <span className="text-xs text-muted-foreground">{item.readTime}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{item.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">By {item.author}</span>
                    <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">Read More <ArrowRight className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
