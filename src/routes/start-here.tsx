import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator, UserRound, Wrench, BookOpen, Search, MapPin, School, Gauge, Mic, Globe, ClipboardCheck,
  Volume2, VolumeX, ArrowRight, Lock, ShieldCheck, Users, Check, ChevronDown, MessageCircle, Instagram, Linkedin, Youtube, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
    return h;
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
function StartHerePage() {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const nonPartnerCount = useMemo(() => START_TOOLS.filter((t) => t.group !== "partners").length, []);

  return (
    <div className="min-h-screen bg-background font-body text-base text-foreground">
      {/* 1. Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" aria-label="MBA Compass home"><img src={BRAND_LOGO_URL} alt="MBA Compass" className="w-auto" style={{ height: 36 }} width={140} height={36} /></a>
          <WhatsAppButton label="Join WhatsApp" where="header" size="sm" />
        </div>
      </header>

      <main>
        {/* 2. Hero + live chat */}
        <section className="relative overflow-hidden bg-gradient-to-b from-accent via-accent/30 to-background">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="container relative mx-auto grid items-center gap-10 px-4 py-12 md:py-20 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary"><Sparkles className="size-4" aria-hidden="true" /> Start here</p>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
                Your First MBA Partner for the <span className="font-editorial italic text-primary">Entire Journey.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground lg:mx-0">
                From choosing your exam to landing your dream college. Free tools, expert guidance and a community of aspirants, all in one place.
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
                [ShieldCheck, "Verified information", "Facts checked against official sources"],
                [Users, "Peer community", "Aspirants preparing for the same exams"],
                [Sparkles, "Free tools", "Calculators, shortlisters and mocks"],
              ].map(([I, t, d]) => { const Ic = I as typeof Users; return (
                <div key={t as string} className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Ic className="size-5" aria-hidden="true" /></span>
                  <div><dt className="font-heading text-base font-bold text-foreground">{t as string}</dt><dd className="text-sm text-muted-foreground">{d as string}</dd></div>
                </div>); })}
            </dl>
          </div>
        </section>

        {/* Journey roadmap */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-center font-heading text-3xl font-extrabold md:text-4xl">Your MBA journey, step by step</h2>
          <ol className="relative mt-10 grid gap-6 border-l-2 border-primary/20 pl-8 md:grid-cols-3 md:border-l-0 md:pl-0 lg:grid-cols-6">
            {JOURNEY.map((s, i) => (
              <li key={s.title} className="relative animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both" style={{ animationDelay: `${i * 120}ms` }}>
                <span className="absolute -left-[2.65rem] grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground md:static md:mb-3">{i + 1}</span>
                <h3 className="font-heading text-lg font-bold">{s.title}</h3>
                <p className="mt-1 text-base text-muted-foreground">{s.text}</p>
                <a href={s.url} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => track("journey_click", s.title)}>Explore <ArrowRight className="size-3.5" aria-hidden="true" /></a>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-center font-editorial text-2xl italic text-primary">Everything you need, in one corner.</p>
        </section>

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

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container mx-auto flex flex-col items-center gap-5 px-4 py-10 md:flex-row md:justify-between">
          <img src={BRAND_LOGO_URL} alt="MBA Compass" className="w-auto" style={{ height: 32 }} loading="lazy" width={124} height={32} />
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-5 text-base">
            {[["Home", "/"], ["Colleges", "/colleges"], ["Exams", "/exam"], ["Articles", "/blog"], ["Mocks", "/mocks"]].map(([l, u]) => (
              <a key={u} href={u} className="hover:text-primary">{l}</a>
            ))}
          </nav>
          <div className="flex gap-3">
            {[[Instagram, "Instagram", "https://www.instagram.com/"], [Linkedin, "LinkedIn", "https://www.linkedin.com/"], [Youtube, "YouTube", "https://www.youtube.com/"]].map(([I, l, u]) => {
              const Ic = I as typeof Instagram;
              return <a key={l as string} href={u as string} target="_blank" rel="noopener noreferrer" aria-label={l as string} className="grid size-10 place-items-center rounded-full bg-accent text-primary hover:bg-primary/15"><Ic className="size-5" /></a>;
            })}
          </div>
        </div>
        <p className="pb-6 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} MBA Compass. All rights reserved.</p>
      </footer>

      {/* Floating WhatsApp (mobile) */}
      <FloatingWhatsApp />
    </div>
  );
}
