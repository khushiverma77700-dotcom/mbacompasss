import { Link } from "@/lib/router-compat";
import {
  LineChart, Megaphone, Users, Truck, Cpu, PieChart, Globe2, Sparkles, ChevronRight,
} from "lucide-react";

const SPECS = [
  { icon: PieChart, name: "Finance", roles: "IB, Corp Fin, Equity Research", ctc: "₹18–40 L" },
  { icon: Megaphone, name: "Marketing", roles: "Brand, Growth, Sales Strategy", ctc: "₹15–32 L" },
  { icon: LineChart, name: "Consulting", roles: "Strategy, Ops, Tech Advisory", ctc: "₹22–45 L" },
  { icon: Users, name: "Human Resources", roles: "HRBP, Talent, Comp & Ben", ctc: "₹12–26 L" },
  { icon: Truck, name: "Operations & SCM", roles: "Supply Chain, Procurement", ctc: "₹13–28 L" },
  { icon: Cpu, name: "Business Analytics", roles: "Data Strategy, Product Analytics", ctc: "₹16–34 L" },
  { icon: Globe2, name: "International Business", roles: "Trade, Global Ops", ctc: "₹12–25 L" },
  { icon: Sparkles, name: "Product Management", roles: "APM, Product Strategy", ctc: "₹20–38 L" },
];

/**
 * Specialisation explorer — helps aspirants map interest to role and pay band,
 * and feeds internal links into the colleges directory.
 */
const HomeSpecializations = () => (
  <section className="py-16 md:py-24 bg-gradient-to-b from-white via-sky-50/50 to-white" id="home-specializations">
    <div className="container mx-auto px-4">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            Choose Your Major
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
            MBA specialisations & <span className="font-editorial italic text-primary">where they lead</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Every major opens a different door. Compare the roles recruiters hire for and the pay band each one commands.
          </p>
        </div>
        <Link
          to="/colleges"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        >
          Browse colleges by course <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {SPECS.map(({ icon: Icon, name, roles, ctc }) => (
          <Link
            key={name}
            to={`/colleges?q=${encodeURIComponent(name)}`}
            className="group relative overflow-hidden rounded-2xl border border-primary/10 bg-white p-4 sm:p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-sky-200/40"
          >
            <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 shadow-md shadow-sky-200/60">
              <Icon className="h-5 w-5 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <h3 className="relative font-heading text-base sm:text-lg font-bold text-foreground leading-tight">{name}</h3>
            <p className="relative mt-1 text-xs text-muted-foreground leading-snug">{roles}</p>
            <p className="relative mt-3 text-xs font-bold text-primary tabular-nums">{ctc}</p>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default HomeSpecializations;
