import type React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator, UserRound, Wrench, BookOpen, Search, MapPin, School, Gauge, Mic, Globe, ClipboardCheck,
  Volume2, VolumeX, ArrowRight, Lock, ShieldCheck, Users, Check, ChevronDown, MessageCircle, Instagram, Linkedin, Youtube, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { enablePush, pushPermission } from "@/lib/push";
import { publicPageHead } from "@/lib/publicPageHead";
import { BRAND_LOGO_URL } from "@/assets/brandLogo";
import { WHATSAPP_GROUP_URL } from "@/lib/whatsapp";
import {
  START_TOOLS, NEW_ITEMS, JOURNEY, CHAT_MESSAGES, FAQS, withUtm, isExternal, type StartTool, type ToolGroup,
} from "@/data/startHere";

export const Route = createFileRoute("/start-here")({
  head: () => {
    const h = publicPageHead(
      "/start-here",
      "Start Here | Free MBA Preparation Tools & Community, MBA Compass",
      "Your first MBA partner. Join our free WhatsApp community and open every free MBA tool, calculator and college shortlister in one click.",
    );
    // Keep the full requested title rather than the shortened shared one.
    h.meta[0] = { title: "Start Here | Free MBA Preparation Tools & Community, MBA Compass" };
    return {
      ...h,
      scripts: [
        ...((h as { scripts?: unknown[] }).scripts ?? []),
        { type: "application/ld+json", children: JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }) },
      ],
    } as typeof h;
  },
  component: StartHerePage,
});

const ICONS = { calc: Calculator, user: UserRound, wrench: Wrench, book: BookOpen, search: Search, map: MapPin, school: School, score: Gauge, mic: Mic, globe: Globe, test: ClipboardCheck };
const WA_URL = withUtm(WHATSAPP_GROUP_URL);

/** Google Analytics event, safe when GA is not loaded. */
function track(event: string, label: string) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  if (w.gtag) w.gtag("event", event, { event_label: label, page: "start_here" });
  else w.dataLayer?.push({ event, event_label: label });
}

const AUTH_URL = "/auth?mode=signup&redirect=%2Fstart-here";

/** The community link is only revealed to signed-in students. */
function useWhatsAppLink() {
  const { user, loading } = useAuth();
  const unlocked = !loading && !!user;
  return unlocked
    ? { href: WA_URL, unlocked, extra: { target: "_blank", rel: "noopener noreferrer" } }
    : { href: AUTH_URL, unlocked, extra: {} };
}

function WhatsAppButton({ label = "Join WhatsApp Community", where, size = "lg" }: { label?: string; where: string; size?: "sm" | "lg" }) {
  const { href, unlocked, extra } = useWhatsAppLink();
  return (
    <a
      href={href}
      {...extra}
      onClick={() => track(unlocked ? "whatsapp_join_click" : "whatsapp_signup_gate", where)}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground shadow-lg shadow-whatsapp/25 transition hover:-translate-y-0.5 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${size === "lg" ? "min-h-12 px-6 text-base" : "min-h-10 px-4 text-sm"}`}
    >
      {unlocked ? <MessageCircle className="size-5" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />} {label}
    </a>
  );
}

function GateNote({ className = "" }: { className?: string }) {
  const { unlocked } = useWhatsAppLink();
  return (
    <p className={`text-sm ${className}`}>
      {unlocked ? "You're signed in. Tap to join. Free, no spam." : "Free sign-up required to get the group link. Takes 30 seconds. No spam."}
    </p>
  );
}

/** Gently varying "online" count around 82 for the chat header. */
function useOnlineCount() {
  const [n, setN] = useState(82);
  useEffect(() => {
    const t = setInterval(() => setN((v) => Math.min(96, Math.max(74, v + Math.round(Math.random() * 4 - 2)))), 3500);
    return () => clearInterval(t);
  }, []);
  return n;
}

/* ---------- Animated WhatsApp-style chat ---------- */
const SENDER_COLORS = ["text-primary", "text-destructive", "text-whatsapp-deep", "text-cat-medical", "text-cat-engineering", "text-cat-government"];
const colorFor = (name: string) => SENDER_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % SENDER_COLORS.length];

function useSoftSounds(enabled: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  const play = (freq: number, dur: number, vol: number) => {
    if (!enabled) return;
    try {
      ctx.current ??= new AudioContext();
      const c = ctx.current, o = c.createOscillator(), g = c.createGain();
      o.frequency.value = freq; o.type = "sine";
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
    } catch { /* audio unavailable */ }
  };
  return { pop: () => play(660, 0.12, 0.08), tick: () => play(1200, 0.03, 0.015) };
}

function ChatPhone() {
  const [shown, setShown] = useState<{ id: number; name: string; text: string }[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [sound, setSound] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const phoneRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const idx = useRef(0);
  const { pop, tick } = useSoftSounds(sound);
  const online = useOnlineCount();

  useEffect(() => {
    setSound(localStorage.getItem("start-chat-sound") === "on");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) setShown(CHAT_MESSAGES.slice(0, 6).map((m, id) => ({ ...m, id })));
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (phoneRef.current) io.observe(phoneRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;
    let cancelled = false;
    let t: ReturnType<typeof setTimeout>;
    let typingTicks: ReturnType<typeof setInterval> | undefined;
    const step = () => {
      const msg = CHAT_MESSAGES[idx.current % CHAT_MESSAGES.length];
      setTyping(msg.name);
      typingTicks = setInterval(tick, 180);
      t = setTimeout(() => {
        clearInterval(typingTicks);
        if (cancelled) return;
        setTyping(null);
        setShown((s) => [...s.slice(-14), { ...msg, id: idx.current }]);
        idx.current += 1;
        pop();
        t = setTimeout(step, 900);
      }, 1000 + Math.random() * 1000);
    };
    t = setTimeout(step, 500);
    return () => { cancelled = true; clearTimeout(t); clearInterval(typingTicks); setTyping(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, visible, sound]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [shown, typing]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    localStorage.setItem("start-chat-sound", next ? "on" : "off");
  };

  return (
    <div ref={phoneRef} className="mx-auto w-full max-w-xs rounded-[2.5rem] border-8 border-foreground/85 bg-foreground/85 shadow-2xl">
      <div className="overflow-hidden rounded-[2rem] bg-whatsapp-chat">
        <div className="flex items-center gap-3 bg-whatsapp-deep px-4 py-3 text-whatsapp-foreground">
          <img src={BRAND_LOGO_URL} alt="MBA Compass" className="size-10 shrink-0 rounded-full bg-card object-contain p-1" style={{ height: 40 }} width={40} height={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">MBA Compass Community</p>
            <p className="flex items-center gap-1.5 text-sm opacity-90"><span className="size-2 rounded-full bg-whatsapp" aria-hidden="true" /><span aria-live="polite">{online} online</span><span className="opacity-70">· Live preview</span></p>
          </div>
          <button type="button" onClick={toggleSound} aria-label={sound ? "Turn chat sound off" : "Turn chat sound on"} aria-pressed={sound}
            className="grid size-9 place-items-center rounded-full hover:bg-whatsapp-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-foreground">
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
        </div>
        <div ref={listRef} className="h-96 space-y-2 overflow-y-auto px-3 py-3" aria-live="off" aria-label="Sample community chat">
          {shown.map((m) => (
            <div key={m.id} className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 max-w-[85%] rounded-xl rounded-tl-sm bg-card px-3 py-2 shadow-sm">
              <p className={`text-sm font-semibold ${colorFor(m.name)}`}>{m.name}</p>
              <p className="text-sm text-foreground">{m.text}</p>
            </div>
          ))}
          {typing && (
            <div className="flex items-center gap-2 text-sm italic text-muted-foreground">
              <span className="inline-flex gap-1 rounded-xl bg-card px-3 py-2 shadow-sm">
                {[0, 150, 300].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />)}
              </span>
              {typing} is typing…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tools ---------- */
function ToolCard({ tool }: { tool: StartTool }) {
  const Icon = ICONS[tool.icon];
  const ext = isExternal(tool.url);
  const href = withUtm(tool.url);
  const partner = tool.group === "partners";
  return (
    <li className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
        <span className="flex gap-1.5">
          {tool.badge && <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-accent-foreground">{tool.badge}</span>}
          {!partner && <span className="rounded-full bg-whatsapp/15 px-2.5 py-0.5 text-sm font-semibold text-whatsapp-deep">Free</span>}
        </span>
      </div>
      <h3 className="font-heading text-lg font-bold text-foreground">{tool.name}</h3>
      <p className="mb-4 mt-1 text-base text-muted-foreground">{tool.description}</p>
      <a href={href} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        onClick={() => track(partner ? "partner_click" : "tool_click", tool.name)}
        className="mt-auto inline-flex items-center gap-1.5 text-base font-semibold text-primary hover:gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
        {partner ? "Visit" : "Open Tool"} <ArrowRight className="size-4" aria-hidden="true" />
      </a>
    </li>
  );
}

function ToolSection({ id, title, sub, group, query }: { id: string; title: string; sub: string; group: ToolGroup; query: string }) {
  const q = query.trim().toLowerCase();
  const tools = START_TOOLS.filter((t) => t.group === group && (!q || `${t.name} ${t.description}`.toLowerCase().includes(q)));
  if (!tools.length) return null;
  return (
    <section id={id} className="container mx-auto px-4 py-12 md:py-16">
      <div className="mb-1 h-1 w-12 rounded-full bg-primary" aria-hidden="true" /><h2 className="mt-4 font-heading text-3xl font-extrabold text-foreground md:text-4xl">{title}</h2>
      <p className="mb-8 mt-2 text-base text-muted-foreground">{sub}</p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.map((t) => <ToolCard key={t.name} tool={t} />)}</ul>
    </section>
  );
}

function FloatingWhatsApp() {
  const { href, unlocked, extra } = useWhatsAppLink();
  return (
    <a href={href} {...extra} aria-label={unlocked ? "Join WhatsApp Community" : "Sign up to join the WhatsApp Community"} onClick={() => track(unlocked ? "whatsapp_join_click" : "whatsapp_signup_gate", "floating")}
      className="fixed bottom-5 right-5 z-50 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-xl md:hidden">
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}

/* ---------- Page ---------- */
const ROTATING = ["MBA Planning", "MBA Coaching", "MBA Updates", "Free MBA Guidance", "GD-PI Help", "MBA Mocks", "MBA College Shortlister"];

function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % ROTATING.length), 2200);
    return () => window.clearInterval(t);
  }, []);
  return (
    <span className="relative inline-flex h-[1.5em] items-center overflow-hidden rounded-xl border border-primary/25 bg-primary/10 px-3 align-middle shadow-sm">
      <span key={i} className="whitespace-nowrap font-bold text-primary animate-in fade-in slide-in-from-bottom-full duration-500">{ROTATING[i]}</span>
    </span>
  );
}

const PROMPT_KEY = "start_here_notify_prompt";

function NotificationPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (pushPermission() !== "default" || localStorage.getItem(PROMPT_KEY)) return;
    const t = window.setTimeout(() => setOpen(true), 6000);
    return () => window.clearTimeout(t);
  }, []);
  if (!open) return null;
  const close = () => { localStorage.setItem(PROMPT_KEY, String(Date.now())); setOpen(false); };
  const allow = async () => {
    const r = await enablePush(user?.id ?? null);
    track("notify_prompt", r);
    if (r === "registered" || r === "already-on") { setMsg("Notifications are on. We will alert you about forms, results and deadlines."); }
    else if (r === "denied") { setMsg("Notifications are blocked in your browser settings."); }
    else { setMsg("Notifications are not available in this browser."); }
    localStorage.setItem(PROMPT_KEY, String(Date.now()));
    window.setTimeout(() => setOpen(false), 2500);
  };
  return (
    <div role="dialog" aria-labelledby="notify-title" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl animate-in fade-in slide-in-from-bottom-4 md:bottom-6">
      <h2 id="notify-title" className="font-heading text-base font-bold">Never miss an MBA deadline</h2>
      <p className="mt-1 text-sm text-muted-foreground">Allow notifications for application closing dates, exam alerts, results and new free mocks. You can turn them off any time.</p>
      {msg ? <p className="mt-3 text-sm font-semibold text-primary">{msg}</p> : (
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={allow} className="min-h-10 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Allow notifications</button>
          <button type="button" onClick={close} className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold">Not now</button>
        </div>
      )}
    </div>
  );
}

const GUIDE = [
  { h: "MBA planning that starts with you", p: "Know your profile, budget and timeline, then pick the right exam: CAT, XAT, SNAP, NMAT or CMAT.", url: "/tools", cta: "Open planning tools" },
  { h: "Coaching and mocks, compared honestly", p: "Compare coaching by format and fees, and practise with exam-pattern mocks with sectional analysis.", url: "/mocks", cta: "Try MBA mocks" },
  { h: "College shortlisting with real data", p: "Filter thousands of colleges by city, fees and exams, and find where you have a real chance.", url: "/colleges", cta: "Explore MBA colleges" },
  { h: "Applications and deadlines in one view", p: "See open forms, closing dates and direct apply links, with forms closing soon highlighted.", url: "/mba-application", cta: "See open applications" },
  { h: "GD-PI and WAT preparation", p: "Prepare for group discussions, interviews and written tests with guides and peer support.", url: "/cat-score-calculator", cta: "Check your CAT score" },
  { h: "Latest MBA updates and articles", p: "Exam notices, results, cutoffs and admission news, written as facts, not noise.", url: "/blog", cta: "Read MBA updates" },
];

function GuideSection() {
  return (
    <section aria-labelledby="guide-title" className="border-y border-border bg-accent/30">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <h2 id="guide-title" className="font-heading text-3xl font-extrabold">How B School Buzz | MBA Compass helps at every stage</h2>
        <p className="mt-3 max-w-3xl text-base text-muted-foreground">
          Getting into a good B-school is a year-long journey with many decisions. This page brings together everything we offer, so you can come back here whenever you are unsure of the next step.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {GUIDE.map((g, i) => (
            <Reveal as="article" key={g.h} delay={(i % 3) * 90} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors duration-300 hover:border-primary/40">
              <h3 className="font-heading text-xl font-bold">{g.h}</h3>
              <p className="mt-2 text-base text-muted-foreground">{g.p}</p>
              <a href={g.url} onClick={() => track("guide_click", g.h)} className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline">{g.cta} <ArrowRight className="size-3.5" aria-hidden="true" /></a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reveal({ as = "div", delay = 0, className = "", children }: { as?: "div" | "li" | "article" | "section"; delay?: number; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Tag = as as "div";
  return (
    <Tag ref={ref as React.Ref<HTMLDivElement>} style={{ transitionDelay: `${delay}ms` }}
      className={`${className} transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      {children}
    </Tag>
  );
}

const QUICK = [
  ["Calculate my CAT score", "/cat-score-calculator"],
  ["Take a free mock", "/mocks"],
  ["Find MBA colleges", "/colleges"],
  ["Check open applications", "/mba-application"],
  ["Read latest updates", "/blog"],
  ["Compare coaching", "/coaching"],
];

function QuickActions() {
  return (
    <section aria-labelledby="quick-title" className="container mx-auto px-4 py-10">
      <Reveal className="rounded-2xl border border-primary/20 bg-card p-6 shadow-sm md:p-8">
        <h2 id="quick-title" className="font-heading text-2xl font-bold">What would you like to do today?</h2>
        <p className="mt-1 text-base text-muted-foreground">Pick a starting point. Each one takes less than a minute to open.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK.map(([l, u]) => (
            <a key={u} href={u} onClick={() => track("quick_action", l)} className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-background px-4 font-semibold transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-primary">
              {l} <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </a>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function StartHerePage() {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const nonPartnerCount = useMemo(() => START_TOOLS.filter((t) => t.group !== "partners").length, []);

  return (
    <div className="min-h-screen bg-background font-body text-base text-foreground">
      <Navbar />
      <NotificationPrompt />

      <main>
        {/* 2. Hero + live chat */}
        <section className="relative overflow-hidden bg-gradient-to-b from-accent via-accent/30 to-background">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="container relative mx-auto grid items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">Welcome</p>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight">
                Welcome to B School Buzz | MBA Compass
              </h1>
              <p className="mt-3 font-heading text-2xl font-bold text-foreground">
                Your only MBA partner until you reach your dream MBA college.
              </p>
              <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-2xl font-semibold text-muted-foreground lg:justify-start" aria-live="polite">
                <span>One place for</span> <RotatingWord />
              </p>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground lg:mx-0">
                From choosing your exam to accepting your admission offer, we stay with you at every stage: planning, preparation, mocks, college shortlisting, applications and GD-PI. Free tools, honest guidance and a community of aspirants preparing alongside you.
              </p>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <WhatsAppButton where="hero" />
                <a href="#free-tools" className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-6 font-semibold text-foreground shadow-sm hover:border-primary/40 hover:text-primary">Explore Free Tools</a>
              </div>
              <GateNote className="mt-3 text-muted-foreground" />
            </div>
            <ChatPhone />
          </div>
          <div className="container relative mx-auto px-4 pb-12">
            <dl className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur sm:grid-cols-3">
              {[
                [ShieldCheck, "Clear guidance", "Simple, practical advice at every step"],
                [Users, "Peer community", "Aspirants preparing for the same exams"],
                [Sparkles, "Free tools", "Calculators, shortlisters and mocks"],
              ].map(([, t, d]) => { return (
                <div key={t as string} className="border-l-2 border-primary pl-4">
                  <div><dt className="font-heading text-base font-bold text-foreground">{t as string}</dt><dd className="text-sm text-muted-foreground">{d as string}</dd></div>
                </div>); })}
            </dl>
          </div>
        </section>

        {/* Journey roadmap */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-center font-heading text-3xl font-extrabold md:text-4xl">Your MBA journey, step by step</h2>
          <ol className="relative mt-10 grid gap-5 border-l-2 border-primary/20 pl-8 md:grid-cols-3 md:border-l-0 md:pl-0">
            {JOURNEY.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 90} className="relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors duration-300 hover:border-primary/40">
                <span className="absolute -left-[2.65rem] top-5 grid size-8 place-items-center rounded-full border-2 border-primary bg-background text-sm font-bold text-primary md:static md:mb-3">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-heading text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-base text-muted-foreground">{s.text}</p>
                <a href={s.url} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => track("journey_click", s.title)}>Explore <ArrowRight className="size-3.5" aria-hidden="true" /></a>
              </Reveal>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/tools/college-shortlister" onClick={() => track("journey_cta", "shortlister")} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary/90">Shortlist my colleges <ArrowRight className="size-4" aria-hidden="true" /></a>
            <a href="/mba-application" onClick={() => track("journey_cta", "applications")} className="inline-flex min-h-12 items-center rounded-xl border border-border bg-card px-6 font-semibold hover:border-primary/40 hover:text-primary">See open applications</a>
          </div>
        </section>

        <QuickActions />

        <GuideSection />

        {/* Community card */}
        <section className="container mx-auto px-4 py-6">
          <div className="rounded-3xl bg-whatsapp-deep p-8 text-whatsapp-foreground md:p-12">
            <h2 className="font-heading text-3xl font-extrabold md:text-4xl">Join a growing community of MBA aspirants</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Exam alerts on time", "Free resources and notes", "Doubt support from peers", "Admission and form updates"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-base"><Check className="size-5 shrink-0" aria-hidden="true" /> {b}</li>
              ))}
            </ul>
            <div className="mt-7"><WhatsAppButton where="community_card" /></div>
            <GateNote className="mt-3 opacity-85" />
          </div>
        </section>

        {/* Search (shown when there are more than 8 tools) */}
        {nonPartnerCount > 8 && (
          <div id="free-tools" className="container mx-auto px-4 pt-12">
            <label htmlFor="tool-search" className="sr-only">Search tools</label>
            <div className="relative mx-auto max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input id="tool-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools, e.g. ROI or CAT"
                className="min-h-12 w-full rounded-full border border-input bg-card pl-12 pr-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          </div>
        )}

        <ToolSection id="tools-free" title="Free tools to power your prep." sub="Open any tool in one tap. No payment needed." group="free" query={query} />
        <ToolSection id="tools-colleges" title="Find colleges that fit your profile." sub="Shortlist smartly, then apply with confidence." group="colleges" query={query} />
        <ToolSection id="tools-gdpi" title="GD-PI season? We've got you." sub="Check your score and get ready for interviews." group="gdpi" query={query} />
        <ToolSection id="partners" title="Trusted partners for your journey." sub="Websites we work with." group="partners" query={query} />

        {/* New on MBA Compass */}
        <section className="container mx-auto px-4 py-8">
          <div className="rounded-2xl border border-primary/20 bg-accent/50 p-6">
            <h2 className="font-heading text-2xl font-bold">New on MBA Compass</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-3">
              {NEW_ITEMS.slice(0, 3).map((n) => (
                <li key={n.title}>
                  <a href={n.url} onClick={() => track("new_item_click", n.title)} className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 font-semibold hover:text-primary">
                    {n.title} <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto max-w-3xl px-4 py-12">
          <h2 className="mb-6 text-center font-heading text-3xl font-extrabold">Questions? Quick answers.</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <h3>
                  <button type="button" aria-expanded={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    {f.q} <ChevronDown className={`size-5 shrink-0 transition ${openFaq === i ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                </h3>
                {openFaq === i && <p className="px-5 pb-4 text-base text-muted-foreground">{f.a}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 pb-16">
          <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-accent p-10 text-center">
            <h2 className="font-heading text-3xl font-extrabold md:text-4xl">Your MBA journey starts today.</h2>
            <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">Join the community and get every update, free.</p>
            <div className="mt-6"><WhatsAppButton where="final_cta" /></div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Floating WhatsApp (mobile) */}
      <FloatingWhatsApp />
    </div>
  );
}
