/**
 * Start Here page content. Edit this file only to change the page.
 * - Add a tool: add one line to START_TOOLS.
 * - Add a chat message: add one line to CHAT_MESSAGES.
 * - Update "New on MBA Compass": edit NEW_ITEMS (latest 3 are shown).
 */
export type ToolGroup = "free" | "colleges" | "gdpi" | "partners";
export type ToolIcon = "calc" | "user" | "wrench" | "book" | "search" | "map" | "school" | "score" | "mic" | "globe" | "test";

export interface StartTool {
  group: ToolGroup;
  name: string;
  description: string;
  icon: ToolIcon;
  url: string;
  badge?: "New" | "Popular";
}

export const START_TOOLS: StartTool[] = [
  { group: "free", name: "MBA ROI Calculator", description: "See what your MBA really pays back.", icon: "calc", url: "/tools/roi-calculator", badge: "Popular" },
  { group: "free", name: "AI Profile Analyzer", description: "Know where your profile stands, in minutes.", icon: "user", url: "/tools/profile-analyzer", badge: "Popular" },
  { group: "free", name: "All Free Tools", description: "Every calculator and finder in one place.", icon: "wrench", url: "/tools" },
  { group: "free", name: "Free Study Material", description: "Formulas, guides and freebies for your prep.", icon: "book", url: "/freebies" },
  { group: "free", name: "Free Mock Tests", description: "Practise real exam-style mocks.", icon: "test", url: "/mocks" },
  { group: "colleges", name: "College Shortlister", description: "Get colleges matched to your score and profile.", icon: "search", url: "/tools/college-shortlister", badge: "Popular" },
  { group: "colleges", name: "Explore MBA Colleges", description: "Fees, placements and cutoffs, side by side.", icon: "school", url: "/colleges" },
  { group: "colleges", name: "Open Applications", description: "Forms open now, with closing dates.", icon: "map", url: "/mba-application", badge: "New" },
  { group: "gdpi", name: "CAT Score Calculator", description: "Check your raw score from the answer key.", icon: "score", url: "/tools/cat-score-calculator", badge: "Popular" },
  { group: "gdpi", name: "IIM Waitlist Movement", description: "Track how far waitlists are moving.", icon: "score", url: "/tools/iim-waitlist-movement" },
  { group: "gdpi", name: "GD-PI Articles", description: "Interview, GD and WAT tips from our editors.", icon: "mic", url: "/blog" },
  { group: "partners", name: "B School Buzz", description: "News and insights on B-schools across India.", icon: "globe", url: "https://bschoolbuzz.in" },
  { group: "partners", name: "My MBA Plan", description: "Plan your MBA journey step by step.", icon: "globe", url: "https://mymbaplan.in" },
];

export const NEW_ITEMS = [
  { title: "Open MBA applications list", url: "/mba-application" },
  { title: "CAT score vs percentile guide", url: "/tools/cat-score-calculator" },
  { title: "IIM waitlist movement tracker", url: "/tools/iim-waitlist-movement" },
];

/** The four tools shown under "Start with the most demanded tools". */
export interface TopTool { title: string; text: string; url: string; icon: ToolIcon; }
export const TOP_TOOLS: TopTool[] = [
  { title: "AI Profile Analyser", text: "See how strong your profile looks to colleges, in minutes.", url: "/tools/profile-analyzer", icon: "user" },
  { title: "ROI Calculator", text: "Check fees, loans and payback before you commit.", url: "/tools/roi-calculator", icon: "calc" },
  { title: "College Finder", text: "Match colleges to your score, budget and city.", url: "/tools/college-finder", icon: "school" },
  { title: "Coaching Finder", text: "Find coaching that fits your exam, city and budget.", url: "/compare", icon: "book" },
];

export const CHAT_MESSAGES: { name: string; text: string }[] = [
  { name: "Rahul", text: "Which MBA should I go for with a 90 percentile?" },
  { name: "Priya", text: "Depends on your profile. Try the college shortlister, it helped me." },
  { name: "Ankit", text: "Is IIM Indore worth it with 2 years of work experience?" },
  { name: "Sneha", text: "Totally. Work-ex helps a lot in the PI round." },
  { name: "Aman", text: "Anyone tried the ROI calculator? Surprised by the result 😮" },
  { name: "Neha", text: "Yes! Did not expect the payback period to be that short." },
  { name: "Rahul", text: "Which mock series are you all taking for CAT?" },
  { name: "Priya", text: "Doing one mock every Sunday and analysing on Monday." },
  { name: "Ankit", text: "How are you preparing for GD-PI?" },
  { name: "Sneha", text: "Reading the newspaper daily and doing mock interviews." },
  { name: "Aman", text: "XAT or SNAP, which one should I attempt?" },
  { name: "Neha", text: "Both if you can. Different colleges, more calls." },
  { name: "Rahul", text: "Can someone share the CAT score calculator link?" },
  { name: "Priya", text: "It's on mbacompass.in under Tools 👍" },
  { name: "Ankit", text: "Is 70 percentile enough for good private colleges?" },
  { name: "Sneha", text: "Many good options exist. Check the open applications list." },
  { name: "Aman", text: "How many hours a day do you study for QA?" },
  { name: "Neha", text: "Around 2 hours. Consistency matters more than hours." },
  { name: "Rahul", text: "Any tips for VARC? My RC accuracy is low." },
  { name: "Priya", text: "Read one long article daily. It slowly gets better." },
  { name: "Ankit", text: "When do NMAT registrations close?" },
  { name: "Sneha", text: "Check the exam page, dates are listed there." },
  { name: "Aman", text: "Just got a call from a college I applied to! 🎉" },
  { name: "Neha", text: "Congrats Aman! Which one?" },
  { name: "Rahul", text: "Should I take a drop year for CAT?" },
  { name: "Priya", text: "Only if you have a clear plan. Talk to a mentor first." },
  { name: "Ankit", text: "Is the Profile Analyzer really free?" },
  { name: "Sneha", text: "Yes, I used it last week. Very detailed." },
  { name: "Aman", text: "What is a good LRDI score for 95 percentile?" },
  { name: "Neha", text: "The score vs percentile guide on the site explains it well." },
];

export const FAQS = [
  { q: "What is B School Buzz | MBA Compass?", a: "B School Buzz | MBA Compass is an MBA guidance platform for Indian aspirants, offering free tools, mocks, college data, application updates and GD-PI help in one place." },
  { q: "Which MBA entrance exams do you cover?", a: "We cover CAT, XAT, SNAP, NMAT, CMAT, MAT and other MBA entrance exams, including exam updates, mocks and score tools." },
  { q: "How do I shortlist MBA colleges?", a: "Use the college shortlister with your expected score and profile, then compare fees, placements and exams accepted on each college page." },
  { q: "Is everything free?", a: "Yes. All tools on this page and the WhatsApp community are free to use." },
  { q: "Who is this for?", a: "Anyone planning an MBA in India: first-time aspirants, repeaters and working professionals." },
  { q: "How do I join the community?", a: "Tap any Join WhatsApp Community button. It opens WhatsApp and you can join in one tap." },
  { q: "Which exams do you cover?", a: "CAT, XAT, SNAP, NMAT, CMAT, MAT, IIFT and other major MBA entrance exams." },
  { q: "Will I get spam messages?", a: "No. We only share useful updates like exam alerts, resources and admission news." },
];

const UTM = "utm_source=start_page&utm_medium=website&utm_campaign=welcome";
export const isExternal = (url: string) => /^https?:\/\//.test(url);
/** Adds the Start Here UTM tags to any link. */
export const withUtm = (url: string) => {
  const [base, hash] = url.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}${UTM}${hash ? `#${hash}` : ""}`;
};
