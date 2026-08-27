import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "isomorphic-dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowRight, Building2, CalendarDays, CheckCircle2, Clock, ExternalLink, FileText,
  Globe, HelpCircle, IndianRupee, Info, Layers, Mail, Phone,
} from "lucide-react";
import { useScrollableTables } from "@/hooks/useScrollableTables";
import { cleanValue, tableHasRows, type ExamSections, type ExamSource, type TableBlock } from "@/lib/examSections";

/* ---------------------------------------------------------------- primitives */

export const Section = ({ id, title, kicker, children }: { id: string; title: string; kicker?: string; children: ReactNode }) => (
  <section id={id} className="scroll-mt-24">
    <div className="mb-4">
      {kicker && <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">{kicker}</p>}
      <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

export const RichHtml = ({ html, className = "" }: { html?: string; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useScrollableTables(ref, [html]);
  if (!cleanValue(html)) return null;
  return (
    <div
      ref={ref}
      className={`prose prose-sm md:prose-base max-w-none text-muted-foreground prose-headings:font-heading prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary ${className}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html || "") }}
    />
  );
};

export const DataTable = ({ block, caption }: { block?: TableBlock; caption?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useScrollableTables(ref, [block]);
  if (!tableHasRows(block)) return null;
  return (
    <div ref={ref}>
      <div className="ai-table-shell">
        <div className="ai-table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                {block!.columns!.map((c, i) => (
                  <th key={i} className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block!.rows!.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-3 px-3 text-muted-foreground align-top">{cleanValue(cell) || "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {caption && <p className="text-xs text-muted-foreground mt-2">{caption}</p>}
      <RichHtml html={block?.notes} className="mt-3" />
    </div>
  );
};

/* ------------------------------------------------------------------- modules */

export const QuickAnswerBox = ({ items, title }: { items: NonNullable<ExamSections["quick_answer"]>; title: string }) => (
  <Card className="border-primary/20 bg-primary/[0.03]">
    <CardContent className="p-5 md:p-6">
      <h2 className="font-heading text-lg md:text-xl font-bold text-foreground mb-4">{title}</h2>
      <dl className="grid gap-4 md:grid-cols-2">
        {items.filter((i) => cleanValue(i.q) && cleanValue(i.a)).map((item, i) => (
          <div key={i}>
            <dt className="text-sm font-semibold text-foreground flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />{item.q}
            </dt>
            <dd className="text-sm text-muted-foreground mt-1 pl-6">{item.a}</dd>
          </div>
        ))}
      </dl>
    </CardContent>
  </Card>
);

/* Highlight cards ---------------------------------------------------------- */

const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{8,16}$/;

const highlightIcon = (label: string) => {
  const l = (label || "").toLowerCase();
  if (/portal|website|link|site|url/.test(l)) return Globe;
  if (/email|mail|helpdesk|contact/.test(l)) return Mail;
  if (/phone|call|mobile/.test(l)) return Phone;
  if (/date|window|day|deadline|schedule/.test(l)) return CalendarDays;
  if (/duration|time|shift/.test(l)) return Clock;
  if (/fee|cost|amount|payment/.test(l)) return IndianRupee;
  if (/document|bulletin|pdf|paper|notification/.test(l)) return FileText;
  if (/body|authority|conduct|organis|organiz/.test(l)) return Building2;
  if (/mode|level|category|frequency/.test(l)) return Layers;
  return Info;
};

const prettyUrl = (url: string) => {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};


/** Keeps highlight values short and scannable — strips editorial asides that
 *  legacy AI runs added, e.g. "(Admit Card download begins, per official site)". */
const tidyHighlight = (raw: string) => {
  let v = raw.trim();
  v = v.replace(/\s*\(([^)]*(?:per official site|official site|as per|source)[^)]*)\)\s*/gi, " ");
  v = v.replace(/,?\s*(?:as )?per (?:the )?official (?:site|website|notification)\.?$/i, "");
  if (v.length > 70) v = v.replace(/\s*\([^)]*\)\s*$/, "");
  return v.replace(/\s{2,}/g, " ").replace(/[;,]\s*$/, "").trim();
};

export const HighlightCards = ({ items }: { items: NonNullable<ExamSections["highlights"]> }) => {
  const valid = items.filter((i) => cleanValue(i.label) && cleanValue(i.value));
  if (!valid.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
      {valid.map((item, i) => {
        const value = tidyHighlight(String(item.value));

        const Icon = highlightIcon(item.label || "");
        const isUrl = URL_RE.test(value);
        const isEmail = EMAIL_RE.test(value);
        const isPhone = PHONE_RE.test(value);

        return (
          <div
            key={i}
            className="group flex h-full flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
                {item.label}
              </p>
            </div>

            {isUrl ? (
              <div className="mt-auto space-y-2">
                <p className="text-sm font-medium text-foreground break-words">{prettyUrl(value)}</p>
                <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                  <a
                    href={value.startsWith("http") ? value : `https://${value}`}
                    target="_blank"
                    rel="noreferrer nofollow"
                  >
                    Open official page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            ) : isEmail ? (
              <div className="mt-auto space-y-2">
                <p className="text-sm font-medium text-foreground break-words">{value}</p>
                <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                  <a href={`mailto:${value}`}>Email helpdesk <Mail className="h-3.5 w-3.5" /></a>
                </Button>
              </div>
            ) : isPhone ? (
              <div className="mt-auto space-y-2">
                <p className="text-sm font-medium text-foreground">{value}</p>
                <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                  <a href={`tel:${value.replace(/\s|-/g, "")}`}>Call helpdesk <Phone className="h-3.5 w-3.5" /></a>
                </Button>
              </div>
            ) : (
              <p className="text-sm md:text-[15px] font-semibold text-foreground leading-snug">{value}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};


export const DatesTable = ({ rows }: { rows: NonNullable<ExamSections["dates"]> }) => {
  const valid = rows.filter((r) => cleanValue(r.event));
  if (!valid.length) return null;
  return (
    <DataTable
      block={{
        columns: ["Event", "Date", "Status", "Notes"],
        rows: valid.map((r) => [r.event || "", r.date || "", r.status || "", r.notes || ""]),
      }}
      caption="Dates may be revised by the conducting authority — always cross-check the latest official notification."
    />
  );
};

export const StepFlow = ({ steps }: { steps: { title?: string; detail?: string }[] }) => {
  const valid = steps.filter((s) => cleanValue(s.title));
  if (!valid.length) return null;
  return (
    <ol className="space-y-3">
      {valid.map((step, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-border bg-card p-4">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{step.title}</p>
            {cleanValue(step.detail) && <p className="text-sm text-muted-foreground mt-0.5">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
};

export const FactList = ({ items }: { items: { label?: string; value?: string }[] }) => {
  const valid = items.filter((i) => cleanValue(i.label) && cleanValue(i.value));
  if (!valid.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {valid.map((item, i) => (
        <div key={i} className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
          <p className="text-sm text-foreground mt-0.5">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export const BulletList = ({ items, icon = true }: { items?: string[]; icon?: boolean }) => {
  const valid = (items || []).filter((i) => cleanValue(i));
  if (!valid.length) return null;
  return (
    <ul className="space-y-2">
      {valid.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          {icon && <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

export const SyllabusAccordion = ({ subjects }: { subjects: NonNullable<ExamSections["syllabus"]> }) => {
  const valid = subjects.filter((s) => cleanValue(s.subject));
  if (!valid.length) return null;
  return (
    <Accordion type="multiple" className="rounded-xl border border-border bg-card divide-y divide-border">
      {valid.map((subject, i) => (
        <AccordionItem key={i} value={`s-${i}`} className="border-0 px-4">
          <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">{subject.subject}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3 pb-2">
              {(subject.topics || []).filter((t) => cleanValue(t.name)).map((topic, ti) => (
                <div key={ti}>
                  <p className="text-sm font-medium text-foreground">{topic.name}</p>
                  {!!topic.subtopics?.filter((s) => cleanValue(s)).length && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {topic.subtopics!.filter((s) => cleanValue(s)).map((sub, si) => (
                        <Badge key={si} variant="secondary" className="text-[11px] font-normal">{sub}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export const PreparationBlocks = ({ items }: { items: NonNullable<ExamSections["preparation"]> }) => {
  const valid = items.filter((i) => cleanValue(i.title) && cleanValue(i.body_html));
  if (!valid.length) return null;
  return (
    <Accordion type="single" collapsible className="rounded-xl border border-border bg-card divide-y divide-border">
      {valid.map((item, i) => (
        <AccordionItem key={i} value={`p-${i}`} className="border-0 px-4">
          <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">{item.title}</AccordionTrigger>
          <AccordionContent><RichHtml html={item.body_html} /></AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export const CollegeModule = ({
  title, colleges, description,
}: { title: string; colleges: NonNullable<ExamSections["colleges"]>; description?: string }) => {
  const valid = colleges.filter((c) => cleanValue(c.name));
  if (!valid.length) return null;
  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <h3 className="font-heading text-lg font-bold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        <div className="mt-4">
          <DataTable
            block={{
              columns: ["Institution", "Location", "Course", "Cutoff", "Fees", "Outcome"],
              rows: valid.map((c) => [c.name || "", c.location || "", c.course || "", c.cutoff || "", c.fees || "", c.outcome || ""]),
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link to="/colleges"><Button size="sm" variant="outline" className="gap-1">Browse all colleges <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
          <Link to="/college-shortlister"><Button size="sm" variant="outline" className="gap-1">Shortlist colleges for my score <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
        </div>
      </CardContent>
    </Card>
  );
};

export const ComparisonBlocks = ({ items }: { items: NonNullable<ExamSections["comparisons"]> }) => {
  const valid = items.filter((c) => cleanValue(c.a) && cleanValue(c.b) && c.points?.length);
  if (!valid.length) return null;
  return (
    <div className="space-y-4">
      {valid.map((cmp, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <h3 className="font-heading text-base font-bold text-foreground mb-3">{cmp.a} vs {cmp.b}</h3>
            <DataTable
              block={{
                columns: ["Parameter", cmp.a || "A", cmp.b || "B"],
                rows: (cmp.points || []).map((p) => [p.parameter || "", p.a_value || "", p.b_value || ""]),
              }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const ResourceLinks = ({ items }: { items: { label?: string; url?: string }[] }) => {
  const valid = items.filter((i) => cleanValue(i.label) && cleanValue(i.url));
  if (!valid.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {valid.map((item, i) => (
        <a key={i} href={item.url} target="_blank" rel="noreferrer nofollow"
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground hover:border-primary/40 transition-colors">
          <span className="min-w-0 truncate">{item.label}</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </a>
      ))}
    </div>
  );
};

export const ToolLinks = ({ items }: { items: NonNullable<ExamSections["tools"]> }) => {
  const valid = items.filter((i) => cleanValue(i.label) && cleanValue(i.url) && i.url!.startsWith("/"));
  if (!valid.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {valid.map((tool, i) => (
        <Link key={i} to={tool.url!} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">{tool.label} <ArrowRight className="w-3.5 h-3.5 text-primary" /></p>
          {cleanValue(tool.description) && <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>}
        </Link>
      ))}
    </div>
  );
};

export const FaqAccordion = ({ items }: { items: NonNullable<ExamSections["faqs"]> }) => {
  const valid = items.filter((f) => cleanValue(f.q) && cleanValue(f.a));
  if (!valid.length) return null;
  return (
    <Accordion type="single" collapsible className="rounded-xl border border-border bg-card divide-y divide-border">
      {valid.map((faq, i) => (
        <AccordionItem key={i} value={`f-${i}`} className="border-0 px-4">
          <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export const UpdatesList = ({ items }: { items: NonNullable<ExamSections["updates"]> }) => {
  const valid = items.filter((u) => cleanValue(u.headline));
  if (!valid.length) return null;
  return (
    <div className="space-y-3">
      {valid.map((update, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {cleanValue(update.date) && <Badge variant="secondary" className="text-[11px]">{update.date}</Badge>}
            <p className="text-sm font-semibold text-foreground">{update.headline}</p>
          </div>
          {cleanValue(update.summary) && <p className="text-sm text-muted-foreground mt-1">{update.summary}</p>}
          {cleanValue(update.source_url) && (
            <a href={update.source_url} target="_blank" rel="noreferrer nofollow" className="text-xs text-primary hover:underline mt-1 inline-block">Official source</a>
          )}
        </div>
      ))}
    </div>
  );
};

export const SourcesBox = ({ sources, reviewedBy, lastUpdated }: { sources: ExamSource[]; reviewedBy?: string | null; lastUpdated?: string | null }) => (
  <Card className="bg-muted/30">
    <CardContent className="p-5 space-y-2">
      <h2 className="font-heading text-base font-bold text-foreground">Sources & editorial information</h2>
      {lastUpdated && <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>}
      {reviewedBy && <p className="text-xs text-muted-foreground">Reviewed by: {reviewedBy}</p>}
      {!!sources?.length && (
        <ul className="space-y-1 pt-1">
          {sources.filter((s) => cleanValue(s.url)).map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer nofollow" className="text-xs text-primary hover:underline break-all">{s.title || s.url}</a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground pt-1">
        Information on this page is compiled from official notifications and authoritative sources and should be verified against the latest official announcement before applying.
      </p>
    </CardContent>
  </Card>
);
