import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Quote, MapPin, Star, ExternalLink, CheckCircle2, XCircle, Sparkles, Calendar, Globe, Youtube, Instagram, Linkedin, Facebook, Twitter, Phone, Mail } from "lucide-react";
import type { SectionDef } from "@/lib/instituteSections";

interface Props {
  def: SectionDef;
  data: any;
}

const InstituteSectionRenderer = ({ def, data }: Props) => {
  switch (def.layout) {
    case "prose":
      return (
        <div
          className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-xl prose-h3:text-base prose-h3:mt-5 prose-h3:text-sky-800 prose-p:leading-[1.75] prose-p:text-slate-700 prose-p:text-[15px] prose-li:text-[15px] prose-li:text-slate-700 prose-strong:text-slate-900 prose-a:text-sky-700 prose-a:no-underline hover:prose-a:underline prose-table:text-sm prose-th:bg-sky-50"
          dangerouslySetInnerHTML={{ __html: data.body || "" }}
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
      const items = data.items || [];
      return (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((t: any, i: number) => (
            <Card key={i} className="bg-gradient-to-br from-sky-50 to-white border-sky-100">
              <CardContent className="p-4 flex gap-3">
                {t.photo_url ? (
                  <img src={t.photo_url} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center font-semibold shrink-0">
                    {(t.name || "?").charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <Quote className="w-4 h-4 text-sky-400 mb-1" />
                  <p className="text-sm text-slate-700 leading-relaxed">{t.text}</p>
                  <div className="text-xs text-muted-foreground mt-2">
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    {t.exam && <> · {t.exam}</>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
