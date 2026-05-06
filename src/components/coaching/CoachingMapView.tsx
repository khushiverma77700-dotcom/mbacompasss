import { useMemo } from "react";
import { MapPin, Building2, ArrowRight } from "lucide-react";

interface Props {
  institutes: any[];
  onCityClick: (city: string) => void;
}

const CoachingMapView = ({ institutes, onCityClick }: Props) => {
  const clusters = useMemo(() => {
    const map = new Map<string, { city: string; state?: string; count: number; topRated: number; insts: any[] }>();
    institutes.forEach(i => {
      const city = (i.city || "").trim();
      if (!city) return;
      const cur = map.get(city) || { city, state: i.state, count: 0, topRated: 0, insts: [] };
      cur.count += 1;
      if ((i.rating || 0) >= 4.5) cur.topRated += 1;
      cur.insts.push(i);
      map.set(city, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [institutes]);

  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-blue-50/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Map View</div>
          <h3 className="text-base font-bold text-slate-900">Coaching clusters by city</h3>
        </div>
        <span className="ml-auto text-[12px] text-slate-500 font-medium">{clusters.length} cities</span>
      </div>

      {clusters.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-500">No cities to map for current filters.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {clusters.map(cl => {
            const intensity = Math.min(1, cl.count / 15);
            return (
              <button
                key={cl.city}
                onClick={() => onCityClick(cl.city)}
                className="group relative rounded-2xl border border-sky-100 bg-white p-4 text-left shadow-sm hover:shadow-lg hover:border-sky-300 hover:-translate-y-0.5 transition-all overflow-hidden"
              >
                <div
                  className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl"
                  style={{ background: `hsl(207 90% 54% / ${0.08 + intensity * 0.18})` }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-[15px] leading-tight truncate">{cl.city}</div>
                      {cl.state && <div className="text-[11px] text-slate-500 truncate">{cl.state}</div>}
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-extrabold text-[14px] shrink-0">
                      {cl.count}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {cl.count} institute{cl.count !== 1 ? "s" : ""}
                    </span>
                    {cl.topRated > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                        ★ {cl.topRated} top-rated
                      </span>
                    )}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoachingMapView;
