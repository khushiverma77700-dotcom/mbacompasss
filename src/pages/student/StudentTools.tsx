import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Sparkles, Target, Calculator, GraduationCap, FileBarChart2, Users } from "lucide-react";

const tools = [
  { title: "AI Profile Analyzer", desc: "Get an MBA admission probability score with tailored recommendations.", href: "/profile-analyzer", icon: Sparkles },
  { title: "College Shortlister", desc: "Personalized college list using your CAT %ile, profile and preferences.", href: "/college-shortlister", icon: Target },
  { title: "MBA ROI Calculator", desc: "Project ROI, payback years and salary upside across top B-schools.", href: "/roi-calculator", icon: Calculator },
  { title: "CAT Score Calculator", desc: "Estimate percentile from raw CAT score in seconds.", href: "/cat-score-calculator", icon: FileBarChart2 },
  { title: "College Finder", desc: "Filter & explore 1000+ MBA colleges across India.", href: "/college-finder", icon: GraduationCap },
  { title: "IIM Waitlist Tracker", desc: "Live waitlist movement and predictions for IIMs.", href: "/iim-waitlist", icon: Users },
];

export default function StudentTools() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">AI Tools</h1>
        <p className="text-sm text-muted-foreground">Free with your account — built for serious aspirants.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((t) => (
          <Link
            key={t.href}
            to={t.href}
            className="group block"
          >
            <Card className="p-5 h-full hover:shadow-lg hover:border-sky-300 transition-all bg-gradient-to-br from-white to-sky-50/40">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white mb-3">
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              <div className="text-xs text-sky-700 mt-3 font-medium group-hover:underline">Open →</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
