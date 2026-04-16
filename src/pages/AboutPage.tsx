import { GraduationCap, Users, Award, Target, CheckCircle, Heart, Globe, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import SEOHead, { generateBreadcrumbSchema } from "@/components/SEOHead";
import { Link } from "react-router-dom";
import PageKeywords from "@/components/PageKeywords";

const AboutPage = () => (
  <div className="min-h-screen bg-background">
    <SEOHead
      title="About BSchoolBuzz — India's Leading MBA Admissions & Coaching Platform"
      description="Learn about BSchoolBuzz.com, India's leading platform connecting MBA aspirants to top B-schools and coaching institutes. Our mission to simplify management education."
      keywords={[
        "about B-School Buzz", "MBA portal mission", "MBA education vision", "B-school buzz story",
        "India's leading platform for MBA aspirants", "connecting students to top MBA colleges in India",
        "our approach to MBA counseling and data", "professional mission of B-School Buzz team",
      ]}
      canonical="https://bschoolbuzz.com/about"
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "About BSchoolBuzz.com",
        url: "https://bschoolbuzz.com/about",
        description: "India's leading platform to find, compare MBA coaching institutes and top B-schools",
        mainEntity: {
          "@type": "Organization",
          name: "BSchoolBuzz",
          url: "https://bschoolbuzz.com",
        },
      }}
    />


    <div className="hero-gradient py-10 md:py-14">
      <div className="container mx-auto px-4 text-center">
        <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-3">About BSchoolBuzz.com</h1>
        <p className="text-primary-foreground/70 max-w-2xl mx-auto text-lg">
          India's most trusted platform for discovering, comparing, and reviewing MBA coaching institutes across all major cities.
        </p>
      </div>
    </div>

    <div className="container mx-auto px-4 py-12 max-w-5xl space-y-12">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: GraduationCap, label: "300+ Coaching Centres", desc: "Verified listings" },
          { icon: Users, label: "5L+ Students", desc: "Guided successfully" },
          { icon: Award, label: "50+ MBA Courses", desc: "Comprehensive coverage" },
          { icon: Target, label: "92% Success Rate", desc: "Average across partners" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-6 text-center">
              <s.icon className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="font-heading font-bold text-foreground">{s.label}</div>
              <div className="text-sm text-muted-foreground">{s.desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mission */}
      <Card className="bg-secondary/20">
        <CardContent className="pt-8 pb-8">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            To democratize access to quality MBA coaching information, enabling every aspiring MBA student to find the right coaching institute that matches their needs, budget, and goals. We believe that the right guidance at the right time can transform careers.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            BSchoolBuzz.com was founded with a simple vision: no student should choose the wrong coaching institute due to lack of transparent information. We aggregate data from hundreds of coaching centres, verify it through our team, and present it in an easy-to-compare format — completely free for students.
          </p>
        </CardContent>
      </Card>

      {/* What We Offer */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-6">What We Offer</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { icon: Globe, title: "Comprehensive Institute Listings", desc: "300+ verified coaching centres across 50+ cities with detailed profiles, fees, faculty info, and student reviews." },
            { icon: BookOpen, title: "Smart Comparison Tool", desc: "Compare up to 3 courses side-by-side on fees, curriculum, success rates, faculty, and teaching mode." },
            { icon: Heart, title: "Genuine Student Reviews", desc: "Read verified reviews from real students who've attended these coaching institutes." },
            { icon: Award, title: "Expert Content & Guides", desc: "Articles, exam tips, preparation strategies, and college guides written by MBA experts." },
            { icon: CheckCircle, title: "Exclusive Offers & Discounts", desc: "Access special coupons and discounts from partner coaching institutes — available only on BSchoolBuzz.com." },
            { icon: Target, title: "College Directory", desc: "Comprehensive MBA college listings with placement data, fees, cutoffs, and admission process details." },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="pt-6 flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Why Trust Us */}
      <Card className="bg-secondary/20">
        <CardContent className="pt-8 pb-8">
          <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Why Trust BSchoolBuzz.com?</h2>
          <div className="space-y-3">
            {[
              "All coaching institute listings are manually verified by our team",
              "We do not accept payments for rankings — all comparisons are unbiased",
              "Student reviews are moderated to ensure authenticity",
              "Data is updated regularly in coordination with coaching institutes",
              "We cover 50+ cities and all major MBA entrance exams",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <PageKeywords contentType="static" recordId="about" fallbackKeywords={["about best MBA coaching", "MBA coaching platform", "MBA coaching comparison India"]} />
    </div>
  </div>
);

export default AboutPage;
