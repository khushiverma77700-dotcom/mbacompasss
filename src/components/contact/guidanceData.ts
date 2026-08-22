import {
  UserCheck, FileText, Scale, CalendarClock, Target, Compass, ListChecks,
  GraduationCap, BarChart3, Briefcase, TrendingUp, MessageCircle,
} from "lucide-react";

export type HelpTopic = {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: any;
  points?: string[];
};

/** Single source of truth: cards on the page and options in the form. */
export const helpTopics: HelpTopic[] = [
  {
    id: "Free Profile Review",
    title: "Free Profile Review",
    description:
      "Get your MBA profile reviewed and understand your strengths, gaps and areas that can be improved.",
    cta: "Get Free Profile Review",
    icon: UserCheck,
  },
  {
    id: "Free Resume Review",
    title: "Free Resume Review",
    description:
      "Share your resume and get guidance on structure, content, positioning and MBA-readiness.",
    cta: "Get Free Resume Review",
    icon: FileText,
  },
  {
    id: "MBA College Review",
    title: "Unbiased MBA College Reviews",
    description:
      "Understand MBA colleges beyond marketing claims — placements, fees, ROI, recruiters, roles and academics.",
    cta: "Get Free College Guidance",
    icon: Scale,
  },
  {
    id: "Free CAT Planner",
    title: "Free CAT Planner",
    description:
      "Get a personalised direction around preparation strategy, study planning, mocks and revision.",
    cta: "Get My Free CAT Plan",
    icon: CalendarClock,
  },
  {
    id: "CAT Strategy",
    title: "CAT Strategies",
    description:
      "Practical guidance on VARC, DILR and Quant strategy, mock analysis, time and attempt strategy.",
    cta: "Get Free CAT Strategy",
    icon: Target,
  },
  {
    id: "CAT / OMET Mentorship",
    title: "CAT & OMET Mentorship",
    description:
      "Guidance for CAT, XAT, SNAP, NMAT, CMAT and other OMETs — preparation, exam selection and next steps.",
    cta: "Get Free Mentorship",
    icon: Compass,
  },
  {
    id: "College Shortlisting",
    title: "MBA College Shortlisting",
    description:
      "Compare B-Schools on profile fit, fees, placements, ROI, specialisation, location and admission chances.",
    cta: "Get Shortlisting Help",
    icon: ListChecks,
  },
  {
    id: "Admission Mentorship",
    title: "Admission Mentorship",
    description:
      "Applications, admission processes, selection criteria, interview preparation and offer comparison.",
    cta: "Get Admission Guidance",
    icon: GraduationCap,
  },
  {
    id: "Placement Report Guidance",
    title: "Placement Report Guidance",
    description:
      "Learn to read placement reports — average, median, recruiters, roles, placement percentage and ROI.",
    cta: "Understand Placements",
    icon: BarChart3,
  },
  {
    id: "Internship Guidance",
    title: "Internship Guidance",
    description:
      "Internship opportunities, profile building, pre-MBA and MBA internships and resume positioning.",
    cta: "Get Internship Help",
    icon: Briefcase,
  },
  {
    id: "MBA Career Guidance",
    title: "MBA Career Guidance",
    description:
      "Finance, Marketing, Consulting, Product, HR, Analytics, Operations — find the path that fits you.",
    cta: "Get Career Guidance",
    icon: TrendingUp,
  },
  {
    id: "General MBA Query",
    title: "General MBA Help & Support",
    description:
      "Have a question that doesn't fit the categories above? Just ask us — we are happy to help.",
    cta: "Ask Your Question",
    icon: MessageCircle,
  },
];

export const helpOptions: string[] = [...helpTopics.map((t) => t.id), "Other"];

export const freeList: string[] = [
  "Free Profile Review",
  "Free Resume Review",
  "Free CAT Planner",
  "Free CAT Strategy Guidance",
  "Free CAT & OMET Mentorship",
  "Free MBA College Guidance",
  "Unbiased MBA College Reviews",
  "Free College Shortlisting Guidance",
  "Free Admission Mentorship",
  "Free Placement Report Guidance",
  "Free Internship Guidance",
  "Free MBA Career Guidance",
  "General MBA Help & Support",
];

export const studentQuestions: string[] = [
  "Which MBA colleges should I target?",
  "Is my profile good enough for an MBA?",
  "Can you review my resume?",
  "How should I prepare for CAT?",
  "Can you create a CAT preparation plan for me?",
  "Which B-School is better for my profile?",
  "How do I compare placement reports?",
  "Which OMETs should I consider?",
  "Should I accept this MBA admission offer?",
  "Which MBA specialisation should I choose?",
];

export const whoCanReachOut: string[] = [
  "CAT aspirants",
  "OMET aspirants",
  "Students waiting for results",
  "Students shortlisting B-Schools",
  "Students comparing colleges",
  "Students looking for admission guidance",
  "Students evaluating placement reports",
  "Students looking for internships",
  "Students planning their MBA journey",
];

export const guidanceFaqs = [
  {
    q: "Is the MBA consultation really free?",
    a: "Yes. MBA Compass is offering this guidance completely free for students for the next one month. There is no consultation fee, no hidden charges and no obligation to purchase anything.",
  },
  {
    q: "Who can apply?",
    a: "Any student seeking guidance related to MBA colleges, CAT, OMETs, admissions, placements, internships or MBA careers can submit a query.",
  },
  {
    q: "Do I need to have a CAT score?",
    a: "No. Students can reach out even if they have not taken CAT yet. Share whatever details you have and we will guide you from there.",
  },
  {
    q: "Can I ask about colleges and placements?",
    a: "Yes. Students can seek guidance related to college selection, admission processes, placement reports, ROI and other MBA-related decisions.",
  },
  {
    q: "How will your team contact me?",
    a: "After submitting the form you will receive a confirmation on screen and our team will reach out to you shortly. You can also join our WhatsApp community for updates, references and further student support.",
  },
];

export const mentorshipJourney: string[] = [
  "CAT Preparation",
  "Profile Building",
  "College Shortlisting",
  "Applications",
  "Interviews",
  "Admission Decisions",
  "MBA Career Planning",
];

export const catPlannerFlow: string[] = [
  "Study",
  "Practice",
  "Mocks",
  "Analysis",
  "Revision",
  "Exam Strategy",
];

export const collegeFactors: string[] = [
  "Fees",
  "Placements",
  "ROI",
  "Roles",
  "Recruiters",
  "Specialisation",
  "Location",
  "Career Outcomes",
];
