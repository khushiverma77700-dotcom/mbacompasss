import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, BookOpen, Layers, ChevronRight } from "lucide-react";
import { buildAnalyzerCanonical, seoSlugify } from "@/lib/seoUrlBuilder";

interface Props {
  exam?: string;
  city?: string;
  state?: string;
  course?: string;
}

const RELATED_EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "IIFT"];
const POPULAR_COURSES = [
  "Finance", "Marketing", "Operations", "HR",
  "IT & Analytics", "Strategy", "General Management", "Entrepreneurship",
];
const NEARBY_BY_STATE: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik"],
  Karnataka: ["Bangalore", "Mysore", "Mangalore", "Hubli"],
  Delhi: ["Delhi", "Gurgaon", "Noida", "Faridabad"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
  Telangana: ["Hyderabad", "Warangal"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Kanpur", "Varanasi"],
  Rajasthan: ["Jaipur", "Udaipur", "Jodhpur"],
};
const TIER1_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"];

const toAnalyzerHref = (overrides: { exam?: string; city?: string; course?: string }) => {
  const url = buildAnalyzerCanonical(overrides);
  return url.replace(/^https?:\/\/[^/]+/, ""); // relative for SPA nav
};

const Chip = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
  >
    {children}
    <ChevronRight className="w-3 h-3 opacity-60" />
  </Link>
);

export const InternalLinksSection = ({ exam, city, state, course }: Props) => {
  const relatedExams = RELATED_EXAMS.filter((e) => e.toLowerCase() !== (exam || "").toLowerCase()).slice(0, 6);
  const nearbyCities = (state && NEARBY_BY_STATE[state])
    || (city && Object.values(NEARBY_BY_STATE).find((arr) => arr.some((c) => c.toLowerCase() === city.toLowerCase())))
    || TIER1_CITIES;
  const cityList = nearbyCities.filter((c) => c.toLowerCase() !== (city || "").toLowerCase()).slice(0, 6);
  const courseList = POPULAR_COURSES.filter((c) => c.toLowerCase() !== (course || "").toLowerCase()).slice(0, 6);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Layers className="w-5 h-5 text-primary" />
          Explore Related MBA Insights
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Hand-picked next steps to deepen your research — every link is crawlable for SEO.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Related exam categories */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Related exam categories</h4>
            <Badge variant="secondary" className="text-[10px]">{relatedExams.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {relatedExams.map((e) => (
              <Chip key={e} to={toAnalyzerHref({ exam: e, city, course })}>
                {e} profile analyser
              </Chip>
            ))}
            {exam && (
              <Chip to={`/exam/${seoSlugify(exam)}`}>About {exam.toUpperCase()}</Chip>
            )}
          </div>
        </div>

        {/* Nearby cities */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">
              {state ? `MBA hubs in ${state}` : city ? `Near ${city}` : "Top MBA cities"}
            </h4>
            <Badge variant="secondary" className="text-[10px]">{cityList.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {cityList.map((c) => (
              <Chip key={c} to={toAnalyzerHref({ exam, city: c, course })}>
                MBA chances from {c}
              </Chip>
            ))}
            {city && (
              <Chip to={`/colleges/${seoSlugify(city)}`}>Colleges in {city}</Chip>
            )}
          </div>
        </div>

        {/* Popular courses */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Popular MBA specialisations</h4>
            <Badge variant="secondary" className="text-[10px]">{courseList.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {courseList.map((c) => (
              <Chip key={c} to={toAnalyzerHref({ exam, city, course: c })}>
                {c} MBA outlook
              </Chip>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InternalLinksSection;
