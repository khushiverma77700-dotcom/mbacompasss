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
    q: "Is MBA counselling free at MBA Compass?",
    a: "Yes. MBA Compass is currently offering free MBA counselling and guidance to students for the one-month initiative. Students can seek guidance related to MBA colleges, admissions, CAT, profiles, resumes, placements and more without paying a consultation fee.",
  },
  {
    q: "Is the MBA profile review free?",
    a: "Yes. Students can request a free MBA profile review. The review can help you understand your profile strengths, areas for improvement and how your academic, work experience and other achievements may fit into your MBA plans.",
  },
  {
    q: "Can I get my MBA resume reviewed for free?",
    a: "Yes. MBA Compass offers free resume review for students. You can get guidance on resume structure, content, achievements, presentation and areas that can be improved for MBA applications and opportunities.",
  },
  {
    q: "Can MBA Compass help me choose the right MBA college?",
    a: "Yes. We can help you compare and shortlist MBA colleges based on factors such as your profile, career goals, fees, placements, ROI, specialisation, location and other relevant considerations.",
  },
  {
    q: "Can I get CAT preparation guidance?",
    a: "Yes. Students can get guidance related to CAT preparation, including study planning, section-wise strategies, mock-test planning, revision and overall preparation strategy.",
  },
  {
    q: "Do you provide CAT mentorship?",
    a: "Yes. MBA Compass provides CAT guidance and mentorship to help students plan their preparation and make better decisions throughout their CAT journey.",
  },
  {
    q: "Can you help me shortlist MBA colleges?",
    a: "Yes. You can get guidance on MBA college shortlisting based on your profile, expected score or percentile, career goals, preferred specialisation, fees, placements and other important factors.",
  },
  {
    q: "Can I get guidance on MBA placement reports?",
    a: "Yes. We can help you understand and compare MBA placement information, including average and median packages, recruiters, roles, placement outcomes, fees and ROI-related factors.",
  },
  {
    q: "Can I get MBA admission guidance?",
    a: "Yes. MBA Compass provides guidance related to applications, college shortlisting, admission processes, selection stages, interviews and comparing admission offers.",
  },
  {
    q: "Who can apply for free MBA guidance?",
    a: "Any student or MBA aspirant looking for guidance related to CAT, OMETs, MBA colleges, admissions, profiles, resumes, placements, internships or MBA careers can submit a request.",
  },
  {
    q: "Do I need a CAT score to get MBA guidance?",
    a: "No. You do not necessarily need a CAT score to seek guidance. Students can reach out at different stages of their MBA journey, including before starting CAT preparation, while preparing for exams or while exploring MBA colleges.",
  },
  {
    q: "Can I get guidance for XAT, SNAP, NMAT and other OMETs?",
    a: "Yes. MBA Compass can provide general guidance around CAT and other MBA entrance exams such as XAT, SNAP, NMAT, CMAT and other OMETs, including preparation strategy, exam planning and next steps.",
  },
  {
    q: "Is MBA Compass's college guidance unbiased?",
    a: "MBA Compass aims to provide student-first, information-focused guidance to help students compare their options. Students are encouraged to evaluate colleges using factors such as fees, placements, ROI, career opportunities, specialisation and personal fit before making a decision.",
  },
  {
    q: "Can I get a free CAT preparation planner?",
    a: "Yes. Students can request a free CAT planner to help structure their preparation. Guidance may include study planning, section-wise preparation, practice, mock tests, analysis and revision.",
  },
  {
    q: "How can I get free MBA counselling?",
    a: "Simply submit the consultation form on this page with your basic details and query. The MBA Compass team can then review your request and reach out to you with relevant guidance.",
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
