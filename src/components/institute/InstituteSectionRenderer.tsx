import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Quote, MapPin, Star, ExternalLink, CheckCircle2, XCircle, Sparkles, Calendar, Globe, Youtube, Instagram, Linkedin, Facebook, Twitter, Phone, Mail, Trophy, Award, GraduationCap, Play, TrendingUp, Medal } from "lucide-react";
import type { SectionDef } from "@/lib/instituteSections";
import { enhanceAIContent } from "@/lib/aiContentEnhancer";

interface Props {
  def: SectionDef;
  data: any;
}

function stripLeadingHeadings(html: string): string {
  if (!html) return "";
  // Run through the AI content enhancer first — converts leftover markdown
  // (### headings, **bold**, - bullets) into proper HTML, strips citation
  // markers, "Last updated" stamps, "(source: …)" parentheticals, and
  // collapses the literal "*" / "#" noise we sometimes see leak through.
  let out = enhanceAIContent(html).trim();
  // Remove repeated leading <h1>..</h1>, <h2>..</h2>, <h3>..</h3> blocks (and surrounding whitespace)
  // These would just duplicate the SectionShell title.
  for (let i = 0; i < 4; i++) {
    const next = out.replace(/^\s*<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>\s*/i, "");
    if (next === out) break;
    out = next;
  }
  return out;
}

const InstituteSectionRenderer = ({ def, data }: Props) => {
  switch (def.layout) {
    case "prose":
      return (
        <div
          className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-base prose-h3:mt-5 prose-h3:text-sky-800 prose-p:leading-[1.75] prose-p:text-slate-700 prose-p:text-[15px] prose-li:text-[15px] prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-sky-700 prose-a:no-underline hover:prose-a:underline prose-table:text-sm prose-th:bg-sky-50"
          dangerouslySetInnerHTML={{ __html: stripLeadingHeadings(data.body || "") }}
        />
      );

    case "bullets": {
      const items: string[] = data.items || [];
      return (
        <ul className="grid md:grid-cols-2 gap-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "faculty": {
      const items = data.items || [];
      return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((f: any, i: number) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4 space-y-2">
                {f.photo_url && (
                  <img src={f.photo_url} alt={f.name} className="w-16 h-16 rounded-full object-cover border" />
                )}
                <div className="font-semibold">{f.name}</div>
                <div className="text-xs text-muted-foreground">{[f.expertise, f.experience].filter(Boolean).join(" · ")}</div>
                {f.achievements && <p className="text-sm text-slate-700 leading-relaxed">{f.achievements}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    case "testimonials": {
      const items: any[] = data.items || [];
      if (items.length === 0) return null;
      const accents = ["from-sky-500 to-blue-600", "from-amber-500 to-orange-500", "from-emerald-500 to-teal-600", "from-violet-500 to-fuchsia-600"];
      return (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((t: any, i: number) => {
            const initial = (t.name || "?").charAt(0).toUpperCase();
            const accent = accents[i % accents.length];
            const rating = Math.max(0, Math.min(5, Number(t.rating) || 5));
            return (
              <Card key={i} className="relative overflow-hidden border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-white hover:shadow-lg transition-all">
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${accent}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      {t.photo_url ? (
                        <img src={t.photo_url} alt={t.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow" />
                      ) : (
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${accent} text-white grid place-items-center font-extrabold text-lg shadow`}>
                          {initial}
                        </div>
                      )}
                      {t.score && (
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-sm whitespace-nowrap">
                          {t.score}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-[15px] leading-tight">{t.name}</span>
                        {rating > 0 && (
                          <span className="inline-flex items-center text-amber-500">
                            {Array.from({ length: rating }).map((_, k) => <Star key={k} className="w-3 h-3 fill-current" />)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {t.exam && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-2 py-0.5">
                            <GraduationCap className="w-2.5 h-2.5" /> {t.exam}{t.year ? ` · ${t.year}` : ""}
                          </span>
                        )}
                        {t.college && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                            <Trophy className="w-2.5 h-2.5" /> {t.college}
                          </span>
                        )}
                      </div>
                    </div>
                    <Quote className="w-6 h-6 text-sky-200 shrink-0" />
                  </div>
                  {t.text && <p className="text-[14px] text-slate-700 leading-[1.7] mt-3">"{t.text}"</p>}
                  {t.video_url && (
                    <a href={t.video_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-sky-700 hover:text-sky-900">
                      <Play className="w-3.5 h-3.5 fill-current" /> Watch video story
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    case "results-detailed": {
      const stats: any[] = data.stats || [];
      const toppers: any[] = data.toppers || [];
      const body: string = data.body || "";
      if (stats.length === 0 && toppers.length === 0 && !body) return null;
      return (
        <div className="space-y-7">
          {stats.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white p-5 md:p-7 shadow-xl relative overflow-hidden">
              <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold bg-white/15 rounded-full px-2.5 py-1 backdrop-blur">
                  <TrendingUp className="w-3 h-3" /> Headline Results
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {stats.map((s: any, i: number) => (
                    <div key={i} className="rounded-xl bg-white/10 border border-white/20 p-4 backdrop-blur">
                      <div className="text-2xl md:text-3xl font-extrabold leading-none">{s.value}</div>
                      <div className="text-[12px] font-semibold mt-1.5 opacity-95">{s.label}</div>
                      {s.sub && <div className="text-[10px] uppercase tracking-wider opacity-75 mt-0.5">{s.sub}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {toppers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Medal className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-[15px]">Star Performers</h3>
                <span className="ml-auto text-[12px] text-slate-500 font-medium">{toppers.length} selections</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {toppers.map((t: any, i: number) => (
                  <div key={i} className="group relative rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-white to-white p-4 shadow-sm hover:shadow-lg hover:border-amber-200 hover:-translate-y-0.5 transition-all overflow-hidden">
                    <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-100/40 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      {t.photo_url ? (
                        <img src={t.photo_url} alt={t.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-200" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center font-extrabold text-lg ring-2 ring-amber-100">
                          {(t.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-[14px] leading-tight truncate">{t.name}</div>
                        {t.rank && (
                          <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 mt-1">
                            <Trophy className="w-2.5 h-2.5" /> {t.rank}
                          </div>
                        )}
                        <div className="mt-2 space-y-0.5 text-[11px] text-slate-600">
                          {(t.exam || t.year) && (
                            <div className="flex items-center gap-1"><GraduationCap className="w-3 h-3 text-sky-600" /> {[t.exam, t.year].filter(Boolean).join(" · ")}</div>
                          )}
                          {t.score && (
                            <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-current" /> <span className="font-bold text-slate-800">{t.score}</span></div>
                          )}
                          {t.college && (
                            <div className="flex items-center gap-1"><Award className="w-3 h-3 text-emerald-600" /> <span className="font-semibold text-slate-800 truncate">{t.college}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {body && (
            <div
              className="prose prose-slate max-w-none prose-headings:font-bold prose-h3:text-base prose-h3:mt-5 prose-h3:text-sky-800 prose-p:leading-[1.75] prose-p:text-slate-700 prose-p:text-[15px] prose-li:text-[15px] prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-sky-700 hover:prose-a:underline prose-table:text-sm prose-th:bg-sky-50 bg-white border border-sky-100 rounded-2xl p-5"
              dangerouslySetInnerHTML={{ __html: stripLeadingHeadings(body) }}
            />
          )}
        </div>
      );
    }


    case "reviews": {
      const items = data.items || [];
      return (
        <div className="space-y-3">
          {items.map((r: any, i: number) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{r.name}</span>
                <span className="flex items-center text-amber-500 text-xs">
                  {Array.from({ length: r.rating || 5 }).map((_, k) => <Star key={k} className="w-3 h-3 fill-current" />)}
                </span>
              </div>
              <p className="text-sm text-slate-700">{r.text}</p>
            </div>
          ))}
        </div>
      );
    }

    case "faq": {
      const items = data.items || [];
      return (
        <Accordion type="single" collapsible className="w-full">
          {items.map((f: any, i: number) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-slate-700">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      );
    }

    case "updates": {
      const items = data.items || [];
      return (
        <div className="space-y-3">
          {items.map((u: any, i: number) => (
            <div key={i} className="border-l-4 border-primary pl-3 py-1">
              {u.date && <div className="text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> {u.date}</div>}
              <div className="font-semibold text-sm">{u.title}</div>
              {u.body && <p className="text-sm text-slate-700 mt-1">{u.body}</p>}
            </div>
          ))}
        </div>
      );
    }

    case "events": {
      const items = data.items || [];
      return (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((e: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-1">
                {e.date && <div className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {e.date}</div>}
                <div className="font-semibold text-sm">{e.title}</div>
                {e.body && <p className="text-sm text-slate-700">{e.body}</p>}
                {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">Details <ExternalLink className="w-3 h-3" /></a>}
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    case "links": {
      const items = data.items || [];
      return (
        <ul className="space-y-2">
          {items.map((l: any, i: number) => (
            <li key={i}>
              <a href={l.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> {l.label || l.url}
              </a>
            </li>
          ))}
        </ul>
      );
    }

    case "locations": {
      const items = data.items || [];
      return (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((c: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{c.city}</div>
                  {c.area && <div className="text-xs text-slate-700">{c.area}</div>}
                  {c.map_url && <a href={c.map_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View on map →</a>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    case "comparison": {
      const items = data.items || [];
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-2 border">Point</th>
                <th className="p-2 border text-primary">Us</th>
                <th className="p-2 border">Others</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="p-2 border font-medium">{r.point}</td>
                  <td className="p-2 border bg-primary/5">{r.us}</td>
                  <td className="p-2 border text-muted-foreground">{r.others}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "pros-cons": {
      const v = data.items || { pros: [], cons: [] };
      return (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4">
              <div className="font-semibold text-emerald-700 mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Pros</div>
              <ul className="space-y-1">
                {(v.pros || []).map((p: string, i: number) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50/40">
            <CardContent className="p-4">
              <div className="font-semibold text-rose-700 mb-2 flex items-center gap-1"><XCircle className="w-4 h-4" /> Cons</div>
              <ul className="space-y-1">
                {(v.cons || []).map((p: string, i: number) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      );
    }

    case "ctas": {
      const items = data.items || [];
      const url = data.url;
      const headline = data.headline;
      return (
        <div className="space-y-3">
          {headline && <p className="font-semibold">{headline}</p>}
          <div className="flex flex-wrap gap-2">
            {url && (
              <a href={url} target="_blank" rel="noreferrer">
                <Button variant="default">Download Brochure</Button>
              </a>
            )}
            {items.map((c: any, i: number) => (
              <a key={i} href={c.url || "#enquiry"}>
                <Button variant={c.style === "outline" ? "outline" : c.style === "ghost" ? "ghost" : "default"}>
                  {c.label}
                </Button>
              </a>
            ))}
          </div>
        </div>
      );
    }

    case "social": {
      const v = data.links || {};
      const map: any = { website: Globe, youtube: Youtube, instagram: Instagram, linkedin: Linkedin, facebook: Facebook, twitter: Twitter };
      return (
        <div className="flex flex-wrap gap-2">
          {Object.entries(v).filter(([, url]) => typeof url === "string" && (url as string).trim()).map(([k, url]) => {
            const Icon = map[k] || Globe;
            return (
              <a key={k} href={url as string} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm border px-3 py-1.5 rounded-full hover:border-primary hover:text-primary capitalize">
                <Icon className="w-3.5 h-3.5" /> {k}
              </a>
            );
          })}
        </div>
      );
    }

    case "keyvalue": {
      const items = data.items || [];
      return (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((r: any, i: number) => {
            const lower = (r.label || "").toLowerCase();
            const Icon = lower.includes("phone") || lower.includes("whatsapp") ? Phone
              : lower.includes("email") ? Mail
              : lower.includes("address") ? MapPin
              : null;
            return (
              <div key={i} className="flex items-start gap-2 text-sm">
                {Icon && <Icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                <div>
                  <div className="text-xs text-muted-foreground">{r.label}</div>
                  <div className="font-medium text-slate-800">{r.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  }
  return null;
};

export default InstituteSectionRenderer;
