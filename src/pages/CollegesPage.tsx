import { useState, useMemo } from "react";
import { MapPin, Search, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { mbaColleges } from "@/data/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CollegesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [examFilter, setExamFilter] = useState("all");

  const allCities = [...new Set(mbaColleges.map((c) => c.city))].sort();
  const allExams = [...new Set(mbaColleges.flatMap((c) => c.examsAccepted))].sort();

  const filtered = useMemo(() => {
    return mbaColleges
      .filter((c) => {
        const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.city.toLowerCase().includes(searchQuery.toLowerCase());
        const matchType = typeFilter === "all" || c.type === typeFilter;
        const matchCity = cityFilter === "all" || c.city === cityFilter;
        const matchExam = examFilter === "all" || c.examsAccepted.includes(examFilter);
        return matchSearch && matchType && matchCity && matchExam;
      })
      .sort((a, b) => a.ranking - b.ranking);
  }, [searchQuery, typeFilter, cityFilter, examFilter]);

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">
            Top MBA Colleges in India 2026
          </h1>
          <p className="text-primary-foreground/70">Browse IIMs, top management colleges, PGDM institutes — city-wise & course-wise</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search colleges..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="College Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="IIM">IIMs</SelectItem>
              <SelectItem value="Top Management">Top Management</SelectItem>
              <SelectItem value="PGDM">PGDM Colleges</SelectItem>
              <SelectItem value="University">University</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {allCities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger><SelectValue placeholder="Exam Accepted" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {allExams.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{filtered.length} colleges found</p>

        {/* College list */}
        <div className="space-y-3">
          {filtered.map((college, i) => (
            <motion.div
              key={college.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              id={college.slug}
              className="bg-card rounded-xl p-5 border border-border card-shadow hover:card-shadow-hover transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                  #{college.ranking}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-foreground">{college.name}</h3>
                    <Badge variant="secondary" className="text-xs">{college.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {college.city}, {college.state}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {college.courses.map((course) => (
                      <Badge key={course} variant="outline" className="text-xs">{course}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 text-right flex-shrink-0">
                  <div>
                    <div className="text-xs text-muted-foreground">Fees</div>
                    <div className="font-heading font-bold text-foreground text-sm">{college.fees}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Package</div>
                    <div className="font-heading font-bold text-primary text-sm">{college.avgPackage}</div>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {college.examsAccepted.map((exam) => (
                      <Badge key={exam} className="text-xs bg-secondary text-secondary-foreground border-none">{exam}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollegesPage;
