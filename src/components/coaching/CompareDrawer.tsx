import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Scale, ArrowRight, Building2 } from "lucide-react";
import { useCoachingCompare } from "@/contexts/CoachingCompareContext";

const CompareDrawer = () => {
  const { items, remove, clear, max } = useCoachingCompare();
  const navigate = useNavigate();
  if (items.length === 0) return null;

  const slots = Array.from({ length: max }, (_, i) => items[i] || null);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-sky-200 shadow-[0_-12px_30px_-12px_rgba(2,132,199,0.25)] animate-in slide-in-from-bottom duration-300">
      <div className="container mx-auto px-4 py-3 max-w-6xl">
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Compare</div>
              <div className="text-[12px] text-slate-600 font-medium">{items.length} of {max} selected</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-2 min-w-0">
            {slots.map((s, i) => (
              <div key={i} className={`rounded-xl border-2 px-3 py-2 flex items-center gap-2 min-w-0 ${s ? "border-sky-200 bg-sky-50/50" : "border-dashed border-slate-200 bg-slate-50/50"}`}>
                {s ? (
                  <>
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-7 h-7 rounded object-contain bg-white border border-slate-200 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-slate-900 truncate leading-tight">{s.name}</div>
                      {s.city && <div className="text-[10px] text-slate-500 truncate">{s.city}</div>}
                    </div>
                    <button onClick={() => remove(s.id)} className="p-1 rounded hover:bg-white shrink-0" aria-label="Remove">
                      <X className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">Pick another institute</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <Button variant="ghost" size="sm" onClick={clear} className="text-slate-600">Clear</Button>
            <Button
              size="sm"
              disabled={items.length < 2}
              onClick={() => navigate(`/compare?coaching=${items.map(i => i.slug).join(",")}`)}
              className="bg-gradient-to-r from-sky-600 to-blue-600 font-semibold gap-1.5"
            >
              Compare {items.length} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareDrawer;
