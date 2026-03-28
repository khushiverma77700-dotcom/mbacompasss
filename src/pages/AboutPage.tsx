import { GraduationCap, Users, Award, Target } from "lucide-react";

const AboutPage = () => (
  <div className="container mx-auto px-4 py-12 max-w-4xl">
    <h1 className="font-heading text-3xl font-bold text-foreground mb-4">About MBAHub</h1>
    <p className="text-muted-foreground text-lg mb-8">
      MBAHub is India's leading platform for discovering and comparing MBA coaching institutes. We help students make informed decisions about their MBA preparation journey.
    </p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
      {[
        { icon: GraduationCap, label: "300+ Coaching Centres", desc: "Verified listings" },
        { icon: Users, label: "5L+ Students", desc: "Guided successfully" },
        { icon: Award, label: "50+ MBA Courses", desc: "Comprehensive coverage" },
        { icon: Target, label: "92% Success Rate", desc: "Average across partners" },
      ].map((s, i) => (
        <div key={i} className="text-center p-4 bg-card rounded-xl border border-border">
          <s.icon className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="font-heading font-bold text-foreground">{s.label}</div>
          <div className="text-sm text-muted-foreground">{s.desc}</div>
        </div>
      ))}
    </div>
    <h2 className="font-heading text-xl font-bold text-foreground mb-3">Our Mission</h2>
    <p className="text-muted-foreground mb-6">To democratize access to quality MBA coaching information, enabling every aspiring MBA student to find the right coaching institute that matches their needs, budget, and goals.</p>
    <h2 className="font-heading text-xl font-bold text-foreground mb-3">What We Offer</h2>
    <ul className="list-disc pl-6 text-muted-foreground space-y-2">
      <li>Comprehensive coaching institute listings with verified information</li>
      <li>Side-by-side comparison of coaching courses, fees, and success rates</li>
      <li>Genuine student reviews and ratings</li>
      <li>Expert articles and exam preparation tips</li>
      <li>MBA college directory with placement data</li>
    </ul>
  </div>
);

export default AboutPage;
