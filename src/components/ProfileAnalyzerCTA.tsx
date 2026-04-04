import { motion } from "framer-motion";
import { BarChart3, Users, ArrowRight, Target, GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import bschoolLogo from "@/assets/bschoolbuzz-logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const ProfileAnalyzerCTA = () => {
  const navigate = useNavigate();

  const sampleScores = [
    { label: "Academics", value: 8.2, color: "from-blue-500 to-blue-600" },
    { label: "Experience", value: 6.5, color: "from-violet-500 to-violet-600" },
    { label: "Diversity", value: 7.0, color: "from-amber-500 to-amber-600" },
    { label: "Consistency", value: 7.8, color: "from-emerald-500 to-emerald-600" },
    { label: "Leadership", value: 6.0, color: "from-rose-500 to-rose-600" },
  ];

  const sampleColleges = [
    { name: "IIM Ahmedabad", chance: 18, tier: "Dream" },
    { name: "IIM Lucknow", chance: 52, tier: "Target" },
    { name: "XLRI Jamshedpur", chance: 68, tier: "Safe" },
  ];

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ repeat: Infinity, duration: 6 }}
        className="absolute top-10 left-[10%] w-72 h-72 rounded-full bg-primary/10 blur-3xl"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
        transition={{ repeat: Infinity, duration: 8, delay: 2 }}
        className="absolute bottom-10 right-[10%] w-96 h-96 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Badge variant="secondary" className="text-sm px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Tool
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Check Your{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                IIM Admission
              </span>{" "}
              Chances — Free
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Get AI-powered profile analysis with <strong>5-dimension scoring</strong>,
              college-wise admission probability, peer comparison among <strong>25,000+</strong> students,
              and a personalised preparation roadmap.
            </p>

            <div className="flex flex-wrap gap-3">
              {[
                { icon: Brain, text: "AI Analysis" },
                { icon: BarChart3, text: "50+ Colleges" },
                { icon: Users, text: "Peer Ranking" },
                { icon: Target, text: "Personalised" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5 border border-border/50">
                  <item.icon className="w-3.5 h-3.5 text-primary" /> {item.text}
                </div>
              ))}
            </div>

            <Button
              size="lg"
              onClick={() => navigate("/profile-analyzer")}
              className="text-lg px-10 py-7 rounded-2xl shadow-2xl group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Analyse My Profile <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
              />
            </Button>
            <p className="text-xs text-muted-foreground">No payment • No signup • Instant results</p>
          </motion.div>

          {/* Right: Animated Report Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -8 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
            className="relative"
          >
            <div className="absolute -inset-3 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-xl opacity-50" />

            <div className="relative bg-card border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden">
              {/* Report header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 px-5 py-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground font-bold text-sm">Sample AI Report</span>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 ml-auto text-xs">Live</Badge>
              </div>

              <div className="p-5 space-y-5">
                {/* Score header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Overall Profile Score</p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      className="text-4xl font-bold text-amber-500"
                    >
                      7.8<span className="text-lg text-muted-foreground">/10</span>
                    </motion.p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Peer Rank</p>
                    <p className="text-2xl font-bold text-primary">Top 32%</p>
                  </div>
                </div>

                {/* Score bars */}
                <div className="space-y-2.5">
                  {sampleScores.map((s, i) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 shrink-0">{s.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${s.value * 10}%` }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                          className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                        />
                      </div>
                      <span className="text-xs font-bold w-8">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Mini college list */}
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground flex justify-between">
                    <span>College</span><span>Your Chance</span>
                  </div>
                  {sampleColleges.map((c, i) => (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="px-3 py-2.5 border-t border-border/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">{c.name}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{c.tier}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${c.chance}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                            className={`h-full rounded-full ${c.chance >= 60 ? "bg-green-500" : c.chance >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                          />
                        </div>
                        <span className="text-xs font-bold">{c.chance}%</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Blurred locked section */}
                <div className="relative">
                  <div className="blur-sm pointer-events-none opacity-40 space-y-2">
                    <div className="h-10 bg-muted rounded-lg" />
                    <div className="h-8 bg-muted rounded-lg" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge variant="outline" className="text-xs bg-card/80 backdrop-blur-sm">
                      <TrendingUp className="w-3 h-3 mr-1" /> + Study Plan, Exam Strategy & More
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ProfileAnalyzerCTA;
