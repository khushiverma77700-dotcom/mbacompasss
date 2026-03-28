import { useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, SlidersHorizontal, X } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { institutes, categories } from "@/data/mockData";

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [showFilters, setShowFilters] = useState(false);

  const category = categories.find((c) => c.slug === slug);
  const filtered = useMemo(() => {
    let list = slug ? institutes.filter((i) => i.category === slug) : institutes;
    if (search) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.location.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "fees-low") list.sort((a, b) => a.feesNum - b.feesNum);
    if (sortBy === "fees-high") list.sort((a, b) => b.feesNum - a.feesNum);
    if (sortBy === "reviews") list.sort((a, b) => b.reviewCount - a.reviewCount);
    return list;
  }, [slug, search, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
            {category ? category.name : "All"} Coaching Institutes
          </h1>
          <p className="text-primary-foreground/70">
            {filtered.length} institutes found
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Input
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-sm"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="fees-low">Fees: Low to High</SelectItem>
              <SelectItem value="fees-high">Fees: High to Low</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <Link key={c.slug} to={`/category/${c.slug}`}>
                <Badge
                  variant={c.slug === slug ? "default" : "secondary"}
                  className="cursor-pointer"
                >
                  {c.name}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((inst, i) => (
            <motion.div
              key={inst.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/institute/${inst.slug}`}
                className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="h-32 hero-gradient relative flex items-center justify-center">
                  <span className="font-heading font-bold text-primary-foreground text-2xl opacity-60">
                    {inst.name.charAt(0)}
                  </span>
                  {inst.featured && (
                    <Badge className="absolute top-3 right-3 bg-cat-mba text-primary-foreground border-none">Featured</Badge>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-heading font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors">
                    {inst.name}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" />
                    {inst.location}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-cat-mba text-cat-mba" />
                      <span className="font-semibold text-foreground">{inst.rating}</span>
                      <span className="text-xs text-muted-foreground">({inst.reviewCount} reviews)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Starting from</span>
                    <span className="font-heading font-bold text-primary">{inst.fees}</span>
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {inst.courses.slice(0, 2).map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No institutes found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
