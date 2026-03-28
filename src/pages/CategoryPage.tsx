import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { Star, MapPin, Users, TrendingUp, SlidersHorizontal, X, Monitor, Building, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { institutes, categories, cities } from "@/data/mockData";

const states = [...new Set(institutes.map((i) => i.state))].sort();
const modes = ["Online", "Offline", "Hybrid"];
const examCategories = categories.map((c) => ({ slug: c.slug, name: c.name }));

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState("rating");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedMode, setSelectedMode] = useState("all");
  const [feeRange, setFeeRange] = useState([0, 200000]);
  const [showFilters, setShowFilters] = useState(false);

  const category = categories.find((c) => c.slug === slug);

  // SEO
  useEffect(() => {
    const title = category
      ? `Best ${category.name} Institutes in India | MBAHub`
      : "All MBA Coaching Institutes in India | MBAHub";
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content",
        category
          ? `Compare top ${category.name} institutes. Find the best MBA coaching in Delhi, Mumbai, Bangalore & more. Filter by fees, ratings, mode.`
          : "Find and compare the best MBA coaching institutes across India. Filter by location, fees, ratings, and mode."
      );
    }
  }, [category]);

  const filtered = useMemo(() => {
    let list = slug ? institutes.filter((i) => i.category === slug) : institutes;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          i.state.toLowerCase().includes(q) ||
          i.courses.some((c) => c.name.toLowerCase().includes(q))
      );
    }
    if (selectedCity !== "all") list = list.filter((i) => i.city === selectedCity);
    if (selectedState !== "all") list = list.filter((i) => i.state === selectedState);
    if (selectedMode !== "all") list = list.filter((i) => i.mode === selectedMode);
    list = list.filter((i) => i.feesNum >= feeRange[0] && i.feesNum <= feeRange[1]);
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sortBy === "fees-low") list.sort((a, b) => a.feesNum - b.feesNum);
    if (sortBy === "fees-high") list.sort((a, b) => b.feesNum - a.feesNum);
    if (sortBy === "reviews") list.sort((a, b) => b.reviewCount - a.reviewCount);
    if (sortBy === "success") list.sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate));
    return list;
  }, [slug, search, sortBy, selectedCity, selectedState, selectedMode, feeRange]);

  const clearFilters = () => {
    setSearch("");
    setSelectedCity("all");
    setSelectedState("all");
    setSelectedMode("all");
    setFeeRange([0, 200000]);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
            {category ? `Best ${category.name} Institutes` : "All MBA Coaching"} in India
          </h1>
          <p className="text-primary-foreground/70">
            {category?.description || "Find the best MBA coaching institutes across India"}
          </p>
          <p className="text-primary-foreground/60 text-sm mt-2">{filtered.length} institutes found</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-8">
          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by name, city, state, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-sm"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="fees-low">Fees: Low to High</SelectItem>
                <SelectItem value="fees-high">Fees: High to Low</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
                <SelectItem value="success">Success Rate</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2 sm:w-auto w-full" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="w-4 h-4" />
              {showFilters ? "Hide Filters" : "Filters"}
            </Button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card rounded-xl p-5 border border-border space-y-4"
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">State</label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger><SelectValue placeholder="All States" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">City</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger><SelectValue placeholder="All Cities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Mode</label>
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger><SelectValue placeholder="All Modes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modes</SelectItem>
                      {modes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Fees: ₹{feeRange[0].toLocaleString()} — ₹{feeRange[1].toLocaleString()}
                  </label>
                  <Slider value={feeRange} onValueChange={setFeeRange} min={0} max={200000} step={5000} className="mt-3" />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-3 h-3 mr-1" /> Clear All Filters</Button>
            </motion.div>
          )}

          {/* Exam category badges */}
          <div className="flex gap-2 flex-wrap">
            {examCategories.map((cat) => (
              <Link key={cat.slug} to={`/category/${cat.slug}`}>
                <Badge variant={slug === cat.slug ? "default" : "secondary"} className="cursor-pointer">{cat.name}</Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((inst, i) => (
            <motion.div key={inst.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link
                to={`/institute/${inst.slug}`}
                className="group block bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1 border border-border"
              >
                <div className="h-28 hero-gradient relative flex items-center justify-center">
                  <span className="font-heading font-bold text-primary-foreground text-2xl opacity-30">{inst.name.charAt(0)}</span>
                  {inst.featured && <Badge className="absolute top-3 left-3 bg-primary-foreground/20 text-primary-foreground border-none text-xs">Featured</Badge>}
                  {inst.discount && <Badge className="absolute top-3 right-3 bg-green-500 text-primary-foreground border-none text-xs">{inst.discount.split(" ")[0]} OFF</Badge>}
                  <Badge className="absolute bottom-3 right-3 bg-primary-foreground/15 text-primary-foreground border-none text-xs">
                    {inst.mode === "Online" ? <Monitor className="w-3 h-3 mr-1" /> : inst.mode === "Hybrid" ? <Wifi className="w-3 h-3 mr-1" /> : <Building className="w-3 h-3 mr-1" />}
                    {inst.mode}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-heading font-semibold text-foreground text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{inst.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" />{inst.location}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-foreground">{inst.rating}</span>
                      <span className="text-xs text-muted-foreground">({inst.reviewCount})</span>
                    </div>
                    <span className="font-heading font-bold text-primary">{inst.fees}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {inst.students}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {inst.successRate}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {inst.courses.slice(0, 2).map((c) => (
                      <Badge key={c.id} variant="secondary" className="text-xs">{c.name}</Badge>
                    ))}
                    {inst.courses.length > 2 && <Badge variant="secondary" className="text-xs">+{inst.courses.length - 2} more</Badge>}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No institutes found matching your criteria.</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear All Filters</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
