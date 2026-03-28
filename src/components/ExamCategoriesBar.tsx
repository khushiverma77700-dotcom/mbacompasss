import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { examDetails } from "@/data/mockData";

const ExamCategoriesBar = () => {
  return (
    <section className="py-8 bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <h3 className="font-heading font-semibold text-foreground text-lg mb-4">
          MBA Entrance Exams
        </h3>
        <div className="flex flex-wrap gap-3">
          {examDetails.map((exam) => (
            <Link
              key={exam.id}
              to={`/exam/${exam.slug}`}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-secondary/50 transition-all card-shadow"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm text-foreground">{exam.name}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExamCategoriesBar;
