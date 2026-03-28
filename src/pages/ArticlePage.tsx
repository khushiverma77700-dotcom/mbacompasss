import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { newsItems } from "@/data/mockData";

const ArticlePage = () => {
  const { id } = useParams<{ id: string }>();
  const article = newsItems.find((n) => n.id === id);

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Article not found</h1>
          <Link to="/blog"><Button>Back to Blog</Button></Link>
        </div>
      </div>
    );
  }

  const related = newsItems.filter((n) => n.id !== article.id && n.category === article.category).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4">
          <Link to="/blog" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Articles
          </Link>
          <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground border-none">{article.category}</Badge>
          <h1 className="font-heading text-xl md:text-3xl font-bold text-primary-foreground mb-3 max-w-3xl">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-primary-foreground/80 text-sm">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {article.author}</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {article.date}</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.readTime} read</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground leading-relaxed text-base">{article.content}</p>
            </div>
          </article>

          <aside className="space-y-4">
            {related.length > 0 && (
              <div className="bg-card rounded-xl p-5 border border-border card-shadow">
                <h3 className="font-heading font-semibold text-foreground mb-4">Related Articles</h3>
                <div className="space-y-3">
                  {related.map((r) => (
                    <Link key={r.id} to={`/article/${r.id}`} className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <Badge variant="secondary" className="text-xs mb-1">{r.category}</Badge>
                      <h4 className="text-sm font-medium text-foreground line-clamp-2">{r.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{r.date}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
