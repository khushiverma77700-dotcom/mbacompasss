import { useNavigate } from "react-router-dom";
import { Building2, GraduationCap, FileQuestion, ArrowRight, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { storePostAuthRedirect } from "@/lib/authRedirect";

const options = [
  {
    type: "coaching",
    icon: Building2,
    title: "List My Coaching Institute",
    desc: "Showcase your courses, faculty, results, and offers to lakhs of MBA aspirants.",
    accent: "from-blue-500/10 to-cyan-500/10",
  },
  {
    type: "college",
    icon: GraduationCap,
    title: "List My College",
    desc: "Add your B-school with placements, fees, rankings and admission details.",
    accent: "from-indigo-500/10 to-blue-500/10",
  },
  {
    type: "request",
    icon: FileQuestion,
    title: "Request a Listing",
    desc: "Not the official rep? Suggest an institute or college for our team to add.",
    accent: "from-sky-500/10 to-blue-500/10",
  },
];

const ListYourBusinessPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelect = (type: string) => {
    // Auth happens inline on the POC page — no pre-redirect needed.
    navigate(`/list-your-business/poc?type=${type}`);
  };

  return (
    <>
      <SEOHead
        title="List Your Coaching Institute or College | B School Buzz"
        description="Get your MBA coaching institute or B-school listed on B School Buzz. Reach lakhs of aspirants with verified, structured listings."
        canonical="https://bschoolbuzz.com/list-your-business"
      />

      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-background to-background">
        <div className="container mx-auto px-4 py-16 lg:py-24">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" /> For Institutes & Colleges
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              List Your Business on B School Buzz
            </h1>
            <p className="text-lg text-muted-foreground">
              Reach thousands of MBA aspirants every month. Submit your listing in minutes — our team reviews and publishes it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <Card
                  key={opt.type}
                  onClick={() => handleSelect(opt.type)}
                  className={`group relative overflow-hidden p-8 cursor-pointer border-2 hover:border-primary/40 hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${opt.accent}`}
                >
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-background shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-foreground">{opt.title}</h3>
                    <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{opt.desc}</p>
                    <div className="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                      Get Started <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
            {[
              { icon: ShieldCheck, title: "Verified & Trusted", desc: "Mobile OTP and admin review keeps every listing authentic." },
              { icon: Layers, title: "Same Schema as Admin", desc: "Add courses, fees, faculty, results, media — exactly like our editors do." },
              { icon: Sparkles, title: "SEO-Ready Pages", desc: "Approved listings get indexed automatically and appear in search results." },
            ].map(({ icon: I, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <I className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>

          {user && (
            <div className="text-center mt-12">
              <Button variant="outline" onClick={() => navigate("/my-listings")}>
                View My Listings
              </Button>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default ListYourBusinessPage;
