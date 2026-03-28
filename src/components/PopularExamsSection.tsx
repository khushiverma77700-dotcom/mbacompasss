import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { FileText, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const PopularExamsSection = () => {
  const { data: exams } = useQuery({
    queryKey: ["popular-exams"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exams")
        .select("name, slug, full_name, exam_date, registration_deadline")
        .order("created_at")
        .limit(6);
      return data || [];
    },
  });

  if (!exams?.length) return null;

  return (
    <section className="py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl font-bold text-foreground mb-2">Popular MBA Exams</h2>
          <p className="text-muted-foreground">Stay updated with exam dates and deadlines</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam, i) => (
            <motion.div
              key={exam.slug}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/exam/${exam.slug}`}
                className="block p-5 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{exam.name}</h3>
                    {exam.full_name && <p className="text-xs text-muted-foreground mt-0.5">{exam.full_name}</p>}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {exam.exam_date && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {exam.exam_date}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularExamsSection;
