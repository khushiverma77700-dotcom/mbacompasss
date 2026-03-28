export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
  color: string;
  description: string;
};

export type Institute = {
  id: string;
  name: string;
  slug: string;
  category: string;
  location: string;
  city: string;
  state: string;
  rating: number;
  reviewCount: number;
  fees: string;
  feesNum: number;
  image: string;
  featured: boolean;
  courses: Course[];
  description: string;
  established: number;
  students: string;
  successRate: string;
  faculty: Faculty[];
  testimonials: Testimonial[];
  results: ResultStat[];
  highlights: string[];
  discount: string;
  mode: string;
  offer?: string;
};

export type Course = {
  id: string;
  name: string;
  duration: string;
  fees: string;
  feesNum: number;
  mode: string;
  curriculum: string[];
  batchSize: string;
  startDate: string;
};

export type Faculty = {
  name: string;
  subject: string;
  experience: string;
  qualification: string;
  image: string;
  bio: string;
  specializations: string[];
};

export type Testimonial = {
  id: string;
  name: string;
  exam: string;
  score: string;
  text: string;
  year: number;
  collegePlaced: string;
  photo: string;
};

export type ResultStat = {
  year: number;
  totalStudents: number;
  selections: number;
  topPercentile: number;
  iimCalls: number;
};

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  category: string;
  image: string;
  author: string;
  readTime: string;
};

export type Announcement = {
  id: string;
  title: string;
  description: string;
  type: "urgent" | "info" | "success";
  date: string;
};

export type MBACollege = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  type: "IIM" | "Top Management" | "PGDM" | "University";
  ranking: number;
  fees: string;
  avgPackage: string;
  examsAccepted: string[];
  courses: string[];
};

export type ExamDetail = {
  id: string;
  name: string;
  slug: string;
  fullName: string;
  conductedBy: string;
  frequency: string;
  mode: string;
  duration: string;
  sections: { name: string; questions: number; marks: number }[];
  eligibility: string[];
  importantDates: { event: string; date: string }[];
  description: string;
  topColleges: string[];
  registrationLink: string;
  previousYearCutoffs: { college: string; cutoff: string }[];
};

export type BannerSlide = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  bgColor: string;
};

// ===================== CATEGORIES =====================
export const categories: Category[] = [
  { id: "1", name: "CAT Coaching", slug: "cat", icon: "Target", count: 120, color: "cat-mba", description: "Prepare for Common Admission Test — gateway to IIMs & top B-schools" },
  { id: "2", name: "GMAT Preparation", slug: "gmat", icon: "Globe", count: 55, color: "cat-mba", description: "Score 700+ for global MBA admissions at top international B-schools" },
  { id: "3", name: "XAT & SNAP", slug: "xat-snap", icon: "BookOpen", count: 70, color: "cat-mba", description: "Coaching for Xavier & Symbiosis entrance exams" },
  { id: "4", name: "GRE & TOEFL", slug: "gre-toefl", icon: "Languages", count: 45, color: "cat-mba", description: "Study abroad test preparation for MS and MBA programs" },
  { id: "5", name: "MAT & CMAT", slug: "mat-cmat", icon: "BarChart3", count: 80, color: "cat-mba", description: "Management aptitude test coaching for AICTE-approved colleges" },
  { id: "6", name: "Interview Prep", slug: "interview", icon: "Users", count: 40, color: "cat-mba", description: "GD/PI preparation and personality development for B-school admissions" },
];

// ===================== BANNER SLIDES =====================
export const bannerSlides: BannerSlide[] = [
  { id: "b1", title: "CAT 2026 Registration Opens Soon", subtitle: "Start your preparation today with India's top-rated coaching institutes. Get personalized study plans and expert mentoring.", cta: "Explore CAT Coaching", ctaLink: "/category/cat", bgColor: "hero-gradient" },
  { id: "b2", title: "Flat 10% Off on All Courses", subtitle: "Enroll before April 30th and save on any MBA coaching program listed on MBAHub. Limited seats available!", cta: "Claim Offer Now", ctaLink: "/compare", bgColor: "hero-gradient" },
  { id: "b3", title: "Free CAT Mock Test Series", subtitle: "Assess your current preparation level with a full-length CAT mock test. Get detailed performance analytics.", cta: "Take Free Mock Test", ctaLink: "/category/cat", bgColor: "hero-gradient" },
  { id: "b4", title: "Top MBA Colleges in India 2026", subtitle: "Explore city-wise and category-wise listings of India's best management colleges accepting CAT, XAT, GMAT scores.", cta: "Browse Colleges", ctaLink: "/colleges", bgColor: "hero-gradient" },
];

// ===================== INSTITUTES =====================
export const institutes: Institute[] = [
  {
    id: "1", name: "IMS Learning Resources", slug: "ims-learning", category: "cat",
    location: "Mumbai, Maharashtra", city: "Mumbai", state: "Maharashtra", rating: 4.8, reviewCount: 342, fees: "₹45,000", feesNum: 45000,
    image: "", featured: true, established: 1977, students: "50,000+", successRate: "92%", mode: "Hybrid",
    discount: "10% Early Bird Discount", offer: "Free SimCAT series worth ₹5,000 with every enrollment",
    description: "IMS Learning Resources is one of India's premier coaching institutes for MBA entrance exams. With over 45 years of experience, IMS has been the launchpad for thousands of IIM aspirants. Their structured pedagogy, comprehensive study material, and personalized mentoring have consistently delivered top percentile results in CAT, XAT, GMAT, and other management entrance exams. IMS boasts a network of 100+ centers across India, making quality MBA preparation accessible nationwide. Their proprietary SimCAT test series is considered the gold standard for CAT practice tests, closely mirroring the actual exam pattern and difficulty level.",
    highlights: ["100+ Centers Pan-India", "45+ Years of Excellence", "Proprietary SimCAT Series", "IIM Alumni Faculty", "Personal Mentoring Program", "AI-Powered Performance Analytics", "Guaranteed Score Improvement"],
    courses: [
      { id: "c1", name: "CAT Complete Course", duration: "12 months", fees: "₹45,000", feesNum: 45000, mode: "Hybrid", curriculum: ["Quantitative Aptitude — Number Systems, Algebra, Geometry, Arithmetic", "Verbal Ability & Reading Comprehension — Para Jumbles, Sentence Correction, RC Strategies", "Data Interpretation & Logical Reasoning — Tables, Graphs, Arrangements, Puzzles", "25+ SimCAT Mock Tests with Detailed Analysis", "GD/PI Preparation with IIM Alumni Panels"], batchSize: "30-40 students", startDate: "April 2026" },
      { id: "c2", name: "GMAT Prep Program", duration: "6 months", fees: "₹35,000", feesNum: 35000, mode: "Online", curriculum: ["Quantitative Reasoning — Problem Solving, Data Sufficiency", "Verbal Reasoning — Critical Reasoning, Sentence Correction, Reading Comprehension", "Integrated Reasoning — Graphics, Multi-Source, Table Analysis", "Analytical Writing Assessment", "15 Full-Length GMAT Practice Tests"], batchSize: "20-25 students", startDate: "May 2026" },
      { id: "c3", name: "XAT + SNAP Combo", duration: "8 months", fees: "₹30,000", feesNum: 30000, mode: "Offline", curriculum: ["Decision Making — Case-based Scenarios, Ethical Dilemmas", "Verbal & Logical Ability — Para Formation, Analogies", "Quantitative Aptitude — Quant for XAT pattern", "General Knowledge & Current Affairs", "Essay Writing Practice with Expert Feedback"], batchSize: "25-30 students", startDate: "June 2026" },
      { id: "c4", name: "CAT Crash Course", duration: "3 months", fees: "₹20,000", feesNum: 20000, mode: "Hybrid", curriculum: ["Intensive QA Sessions — Shortcuts & Speed Techniques", "VARC — Reading Speed Improvement, Grammar Hacks", "DILR — Pattern Recognition, Time Management", "15 Full-Length Mock Tests"], batchSize: "40-50 students", startDate: "August 2026" },
    ],
    faculty: [
      { name: "Prof. Rajesh Sharma", subject: "Quantitative Aptitude", experience: "20 years", qualification: "IIM Ahmedabad Alumni, M.Tech IIT Bombay", image: "", bio: "Prof. Sharma is a CAT 100 percentiler himself, with two decades of teaching experience. He has authored 4 books on quantitative aptitude and his YouTube lectures have over 2 million views. Known for his ability to simplify complex mathematical concepts into easy-to-apply shortcuts.", specializations: ["Number Theory", "Algebra", "Modern Mathematics", "Speed Techniques"] },
      { name: "Prof. Meena Iyer", subject: "Verbal Ability & RC", experience: "15 years", qualification: "MA English Literature, JNU; Cambridge CELTA Certified", image: "", bio: "Prof. Iyer brings a literary depth to VARC preparation. Her RC analysis framework has helped thousands of students improve their reading speed and comprehension accuracy by over 40%. She conducts weekly vocabulary workshops and book clubs for students.", specializations: ["Reading Comprehension Strategies", "Para Jumbles", "Sentence Correction", "Vocabulary Building"] },
      { name: "Prof. Atul Verma", subject: "Data Interpretation & Logical Reasoning", experience: "12 years", qualification: "IIM Bangalore Alumni, B.Tech NIT Warangal", image: "", bio: "Prof. Verma's approach to DILR is highly strategic. He focuses on time management and pattern recognition, teaching students to identify which sets to attempt and which to skip. His DILR masterclass is the highest-rated module at IMS.", specializations: ["Data Analysis", "Puzzle Solving", "Caselets", "Arrangement & Ordering"] },
      { name: "Prof. Sunita Rao", subject: "Logical Reasoning", experience: "10 years", qualification: "ISI Kolkata, B.Tech NIT Surathkal", image: "", bio: "With a mathematical background from ISI, Prof. Rao specializes in advanced logical reasoning. She designs the toughest LR sets in IMS's SimCAT series, preparing students for the most challenging CAT questions.", specializations: ["Binary Logic", "Games & Tournaments", "Network Diagrams", "Constraint-based Reasoning"] },
    ],
    testimonials: [
      { id: "t1", name: "Arjun Mehta", exam: "CAT 2025", score: "99.5 Percentile", text: "IMS transformed my preparation journey completely. The SimCAT series and personalized mentoring helped me crack CAT with a 99.5 percentile. The detailed performance analytics after each mock test showed me exactly where I was losing marks, and the faculty helped me plug those gaps systematically. Now at IIM Ahmedabad!", year: 2025, collegePlaced: "IIM Ahmedabad", photo: "" },
      { id: "t2", name: "Priya Nair", exam: "CAT 2025", score: "98.8 Percentile", text: "The faculty at IMS are exceptional. Prof. Meena's VARC classes changed my entire approach to reading comprehension. I went from struggling with RC to scoring 99+ percentile in VARC alone. The GD/PI preparation was equally thorough — the mock interview panels included IIM alumni who gave brutally honest feedback that shaped my actual IIM interviews.", year: 2025, collegePlaced: "IIM Bangalore", photo: "" },
      { id: "t3", name: "Rahul Singh", exam: "XAT 2025", score: "99.2 Percentile", text: "The XAT-specific modules at IMS were game-changers. Decision Making became my strongest section thanks to Prof. Verma's case-study approach. The essay writing feedback was personalized and helped me develop a strong writing style. Got into XLRI with a scholarship!", year: 2025, collegePlaced: "XLRI Jamshedpur", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 5200, selections: 4784, topPercentile: 320, iimCalls: 890 },
      { year: 2024, totalStudents: 4800, selections: 4320, topPercentile: 280, iimCalls: 750 },
      { year: 2023, totalStudents: 4500, selections: 3960, topPercentile: 250, iimCalls: 680 },
    ],
  },
  {
    id: "2", name: "Career Launcher", slug: "career-launcher", category: "cat",
    location: "New Delhi", city: "Delhi", state: "Delhi", rating: 4.7, reviewCount: 520, fees: "₹42,000", feesNum: 42000,
    image: "", featured: true, established: 1995, students: "60,000+", successRate: "90%", mode: "Hybrid",
    discount: "10% Group Enrollment Discount", offer: "Free CATALYST test series + B-school selection guide",
    description: "Career Launcher is a leading name in MBA test preparation with a track record spanning nearly three decades. Known for their innovative teaching methodology and AI-driven adaptive learning platform, CL has produced countless IIM selections. Their CATALYST test series is widely regarded as the most accurate predictor of CAT performance. CL's strength lies in their data-driven approach — every student gets a personalized preparation roadmap based on diagnostic tests and continuous performance tracking.",
    highlights: ["AI-Powered Adaptive Learning", "CATALYST Test Series", "200+ Centers Nationwide", "Guaranteed Score Improvement", "Alumni Network of 50,000+", "B-School Application Support", "Weekend & Weekday Batches"],
    courses: [
      { id: "c5", name: "CAT Classroom Program", duration: "10 months", fees: "₹42,000", feesNum: 42000, mode: "Offline", curriculum: ["Quantitative Aptitude Masterclass — Foundation to Advanced", "VARC Advanced — Speed Reading, Critical Analysis", "DILR Strategy Sessions — Set Selection & Time Management", "30 Full-Length Mock Tests with AI Analytics", "B-School Application Support & Profile Building"], batchSize: "35-40 students", startDate: "April 2026" },
      { id: "c6", name: "CAT Online Live", duration: "8 months", fees: "₹28,000", feesNum: 28000, mode: "Online", curriculum: ["Live Interactive Classes by Top Faculty", "Recorded Lectures — Lifetime Access", "AI-Based Performance Analytics Dashboard", "20 Mocks + 50 Sectional Tests", "Doubt Resolution within 4 Hours"], batchSize: "Unlimited", startDate: "May 2026" },
      { id: "c7", name: "MBA Interview Prep", duration: "2 months", fees: "₹15,000", feesNum: 15000, mode: "Hybrid", curriculum: ["Group Discussion — 20+ Practice Sessions", "Personal Interview Mock — One-on-One with IIM Alumni", "Current Affairs Daily Digest", "B-School Specific Prep for IIM, XLRI, MDI, etc."], batchSize: "15-20 students", startDate: "January 2027" },
    ],
    faculty: [
      { name: "Prof. Gautam Puri", subject: "Quantitative Aptitude", experience: "25 years", qualification: "IIM Calcutta Alumni, Founder CL", image: "", bio: "As the founder of Career Launcher, Prof. Puri has spent 25 years revolutionizing MBA test preparation. His approach combines rigorous fundamentals with strategic test-taking. He personally mentors the top performers each year and has helped over 10,000 students get into IIMs.", specializations: ["Advanced Algebra", "Geometry", "Number Systems", "Test Strategy"] },
      { name: "Prof. Ananya Bhatt", subject: "Verbal Ability", experience: "18 years", qualification: "Oxford University, MA Literature; IELTS Trainer", image: "", bio: "With an Oxford education, Prof. Bhatt brings global perspective to verbal preparation. Her signature 'Context Mapping' technique for RC has become a CL hallmark. She also conducts vocabulary boot camps that cover 2,000+ words in 30 days.", specializations: ["Reading Comprehension", "Critical Reasoning", "Grammar", "Vocabulary"] },
      { name: "Prof. Vikram Joshi", subject: "DILR", experience: "14 years", qualification: "IIM Lucknow Alumni, Data Scientist", image: "", bio: "Prof. Joshi combines his data science background with MBA coaching expertise. His DILR framework teaches students to visualize complex data sets and crack reasoning puzzles efficiently. Students report a 50% improvement in DILR scores within 3 months of his coaching.", specializations: ["Data Visualization", "Logical Puzzles", "Caselets", "Set Theory"] },
    ],
    testimonials: [
      { id: "t4", name: "Sneha Gupta", exam: "CAT 2025", score: "99.3 Percentile", text: "Career Launcher's CATALYST test series was incredibly accurate. My actual CAT score was within 2 percentile of my CATALYST average. The AI-powered analytics pinpointed my weak areas and the faculty designed a custom improvement plan. The investment paid off a hundred times over.", year: 2025, collegePlaced: "IIM Calcutta", photo: "" },
      { id: "t5", name: "Aditya Kumar", exam: "CAT 2025", score: "98.5 Percentile", text: "The AI-powered analytics dashboard was the biggest differentiator. I could track my progress in real-time, see exactly which question types I was weak in, and get personalized practice sets. Prof. Vikram's DILR classes turned my weakest section into my strongest.", year: 2025, collegePlaced: "IIM Lucknow", photo: "" },
      { id: "t15", name: "Neha Agarwal", exam: "CAT 2025", score: "99.0 Percentile", text: "The GD/PI preparation at CL was phenomenal. Mock interviews with actual IIM alumni gave me the confidence I needed. The current affairs modules ensured I was never caught off guard. Highly recommend for complete MBA preparation.", year: 2025, collegePlaced: "MDI Gurgaon", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 6100, selections: 5490, topPercentile: 380, iimCalls: 920 },
      { year: 2024, totalStudents: 5500, selections: 4950, topPercentile: 340, iimCalls: 820 },
      { year: 2023, totalStudents: 5000, selections: 4400, topPercentile: 300, iimCalls: 720 },
    ],
  },
  {
    id: "3", name: "T.I.M.E. Institute", slug: "time-institute", category: "cat",
    location: "Hyderabad, Telangana", city: "Hyderabad", state: "Telangana", rating: 4.6, reviewCount: 456, fees: "₹38,000", feesNum: 38000,
    image: "", featured: true, established: 1992, students: "40,000+", successRate: "88%", mode: "Hybrid",
    discount: "10% Online Course Discount", offer: "Free AIMCAT series + Study Material",
    description: "T.I.M.E. (Triumphant Institute of Management Education) is a nationally acclaimed coaching institute offering top-tier MBA entrance preparation. Founded by IIM alumni, T.I.M.E. has established itself as a powerhouse for CAT, XAT, and SNAP preparation with a network spanning 200+ cities across India. Their AIMCAT test series is among the most attempted mock test series in India with over 100,000 test-takers each year.",
    highlights: ["Founded by IIM Alumni", "200+ City Network", "AIMCAT Test Series", "Comprehensive Study Material", "Flexible Batch Timings", "Postal Course for Remote Areas", "30+ Years of Trust"],
    courses: [
      { id: "c8", name: "CAT + XAT Complete", duration: "10 months", fees: "₹38,000", feesNum: 38000, mode: "Hybrid", curriculum: ["QA Foundation to Advanced — Arithmetic, Algebra, Geometry, Modern Math", "Verbal Ability Workshops — Grammar, Vocab, RC Mastery", "LR & DI Intensive — 200+ Practice Sets", "25 AIMCATs with National Ranking", "GD/PI Training with B-School Panels"], batchSize: "30-35 students", startDate: "April 2026" },
      { id: "c9", name: "GMAT Complete Prep", duration: "4 months", fees: "₹25,000", feesNum: 25000, mode: "Online", curriculum: ["GMAT Quant — Problem Solving & Data Sufficiency", "GMAT Verbal — SC, CR, RC", "IR & AWA Strategies", "10 Full-Length GMAT Mocks"], batchSize: "20-25 students", startDate: "Rolling Admissions" },
      { id: "c10", name: "GRE Preparation", duration: "3 months", fees: "₹22,000", feesNum: 22000, mode: "Online", curriculum: ["GRE Quant — Arithmetic, Algebra, Geometry, Data Analysis", "GRE Verbal — Text Completion, Sentence Equivalence, RC", "Analytical Writing — Issue & Argument Essays", "8 Practice Tests with Score Analysis"], batchSize: "20 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Ravi Kumar", subject: "Logical Reasoning", experience: "16 years", qualification: "IIM Bangalore Alumni, B.Tech IIT Kharagpur", image: "", bio: "Prof. Kumar's LR classes are legendary at T.I.M.E. His structured approach to solving puzzles — what he calls 'Framework Thinking' — has helped students improve their LR accuracy from 40% to 85% within months. He has authored T.I.M.E.'s bestselling LR workbook.", specializations: ["Puzzles & Arrangements", "Coding-Decoding", "Blood Relations", "Syllogisms"] },
      { name: "Prof. Lakshmi Devi", subject: "Quantitative Aptitude", experience: "14 years", qualification: "M.Sc Mathematics, ISI Kolkata", image: "", bio: "With her ISI background, Prof. Devi makes even the toughest math problems approachable. Her 'Concept First' approach ensures students understand the why before the how, leading to deeper understanding and better retention. She conducts special revision camps before CAT.", specializations: ["Permutations & Combinations", "Probability", "Geometry", "Functions & Graphs"] },
      { name: "Prof. Karthik Reddy", subject: "Verbal Ability", experience: "11 years", qualification: "MA English, University of Hyderabad; Published Author", image: "", bio: "Prof. Reddy is a published author who brings his love for language to the classroom. His 'Active Reading' technique has become a signature method at T.I.M.E. for improving RC speed and accuracy. He runs a daily vocabulary podcast subscribed to by 50,000+ aspirants.", specializations: ["Reading Comprehension", "Para Jumbles", "Summary Questions", "Odd Sentence Out"] },
    ],
    testimonials: [
      { id: "t6", name: "Kavya Sharma", exam: "CAT 2025", score: "99.1 Percentile", text: "T.I.M.E.'s AIMCAT series is hands-down the best mock test series for CAT. The difficulty level perfectly mirrors the actual exam. The national ranking feature helped me benchmark my preparation against thousands of other aspirants. The detailed solutions and video explanations for every question were invaluable.", year: 2025, collegePlaced: "IIM Kozhikode", photo: "" },
      { id: "t7", name: "Rohan Patel", exam: "XAT 2025", score: "98.7 Percentile", text: "The faculty's expertise in XAT-specific Decision Making questions gave me the confidence to ace the exam. Prof. Ravi Kumar's approach to DM was systematic and thorough — he covered every possible scenario type. The essay writing feedback was personalized and extremely helpful.", year: 2025, collegePlaced: "XLRI Jamshedpur", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 4200, selections: 3696, topPercentile: 210, iimCalls: 580 },
      { year: 2024, totalStudents: 3800, selections: 3344, topPercentile: 190, iimCalls: 510 },
      { year: 2023, totalStudents: 3500, selections: 3010, topPercentile: 170, iimCalls: 450 },
    ],
  },
  {
    id: "4", name: "Bulls Eye", slug: "bulls-eye", category: "cat",
    location: "Chandigarh, Punjab", city: "Chandigarh", state: "Punjab", rating: 4.5, reviewCount: 280, fees: "₹32,000", feesNum: 32000,
    image: "", featured: true, established: 1996, students: "35,000+", successRate: "85%", mode: "Offline",
    discount: "10% Scholarship for Top Scorers", offer: "Free mock test series for students scoring 90+ in diagnostic test",
    description: "Bulls Eye is a respected MBA coaching institute known for its focused approach to CAT and other MBA entrance exam preparation. With strong roots in North India, Bulls Eye has expanded nationally with their quality-first approach and affordable pricing. Their teaching methodology focuses on building strong fundamentals before moving to advanced problem-solving, making them ideal for students starting from scratch.",
    highlights: ["Affordable Premium Coaching", "Strong North India Presence", "BullsEye Mock Series", "Personal Mentoring", "Free Test Series for Toppers", "Small Batch Sizes", "Doubt-Clearing Sessions Daily"],
    courses: [
      { id: "c11", name: "CAT Comprehensive", duration: "11 months", fees: "₹32,000", feesNum: 32000, mode: "Offline", curriculum: ["Quantitative Aptitude — Basics to Advanced", "Verbal Ability & RC — Speed Reading, Grammar, Vocab", "Data Interpretation — Charts, Tables, Caselets", "Logical Reasoning — Puzzles, Sequences, Arrangements", "20 Mock Tests + 40 Sectional Tests"], batchSize: "25-30 students", startDate: "May 2026" },
      { id: "c12", name: "CAT Weekend Batch", duration: "8 months", fees: "₹25,000", feesNum: 25000, mode: "Offline", curriculum: ["Weekend Intensive Classes — 8 hrs/weekend", "Weekday Practice Sets & Online Assignments", "10 Full Mocks + 30 Sectionals", "Weekly Doubt Resolution Sessions"], batchSize: "20-25 students", startDate: "June 2026" },
    ],
    faculty: [
      { name: "Prof. Hirdesh Bhatia", subject: "Quantitative Aptitude", experience: "18 years", qualification: "IIM Kozhikode Alumni, B.Tech PEC Chandigarh", image: "", bio: "Prof. Bhatia is known for his energetic teaching style and ability to make complex QA topics fun. His catchphrase 'Math is just logical thinking with numbers' has inspired thousands. He holds the record for producing the most 99+ percentilers from North India.", specializations: ["Arithmetic", "Algebra", "Number Systems", "Geometry"] },
      { name: "Prof. Nidhi Malhotra", subject: "Verbal Ability", experience: "12 years", qualification: "MA English, Punjab University; IELTS 8.5 Scorer", image: "", bio: "Prof. Malhotra's innovative word-root approach to vocabulary has become a Bulls Eye specialty. She conducts daily 15-minute vocabulary sessions that students credit for significant VARC improvement. Her study material includes over 500 curated RC passages.", specializations: ["Vocabulary Building", "Grammar", "Reading Comprehension", "Para Completion"] },
    ],
    testimonials: [
      { id: "t8", name: "Manish Sharma", exam: "CAT 2025", score: "98.2 Percentile", text: "Bulls Eye offers incredible value for money. The quality of coaching rivals institutes charging twice the fees. Prof. Hirdesh's QA classes are engaging and effective. The small batch size meant I got personal attention whenever I needed it. Got into IIM Indore!", year: 2025, collegePlaced: "IIM Indore", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 3000, selections: 2550, topPercentile: 150, iimCalls: 380 },
      { year: 2024, totalStudents: 2700, selections: 2295, topPercentile: 130, iimCalls: 330 },
    ],
  },
  {
    id: "5", name: "Endeavor Careers", slug: "endeavor-careers", category: "gmat",
    location: "Bangalore, Karnataka", city: "Bangalore", state: "Karnataka", rating: 4.7, reviewCount: 310, fees: "₹55,000", feesNum: 55000,
    image: "", featured: true, established: 2001, students: "25,000+", successRate: "91%", mode: "Hybrid",
    discount: "10% Early Registration Offer", offer: "Free Profile Evaluation + 1 Essay Review worth ₹10,000",
    description: "Endeavor Careers specializes in GMAT and GRE preparation for students aspiring to study at top global B-schools. Their expert faculty, many of whom are graduates of Ivy League institutions, provide world-class coaching with a focus on achieving 700+ GMAT scores. Endeavor also offers comprehensive admissions consulting, helping students with school selection, essay writing, and interview preparation.",
    highlights: ["GMAT 700+ Specialists", "Ivy League Faculty", "Personalized Score Strategy", "Free Profile Evaluation", "Application Essay Support", "Scholarship Guidance", "98% Admit Rate"],
    courses: [
      { id: "c13", name: "GMAT 700+ Program", duration: "5 months", fees: "₹55,000", feesNum: 55000, mode: "Hybrid", curriculum: ["GMAT Quant Advanced — Problem Solving, Data Sufficiency", "GMAT Verbal Mastery — SC, CR, RC", "Data Sufficiency Masterclass", "Critical Reasoning Deep Dive", "15 Full-Length GMAT Mocks with Score Analysis"], batchSize: "15-20 students", startDate: "Rolling Admissions" },
      { id: "c14", name: "GRE Complete Prep", duration: "4 months", fees: "₹40,000", feesNum: 40000, mode: "Online", curriculum: ["GRE Quantitative — Arithmetic to Advanced", "GRE Verbal — TC, SE, RC Strategies", "AWA Training — Issue & Argument Templates", "Vocabulary Building — 3,500+ GRE Words", "12 Full Practice Tests"], batchSize: "20 students", startDate: "Rolling Admissions" },
      { id: "c15", name: "MBA Admissions Consulting", duration: "3 months", fees: "₹75,000", feesNum: 75000, mode: "Online", curriculum: ["School Selection Strategy — Based on Profile & Goals", "Essay Review & Editing — Unlimited Revisions", "Resume Building for MBA Applications", "Interview Preparation — Mock Interviews with Admissions Experts", "Scholarship Applications & Financial Aid Guidance"], batchSize: "10 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Arun Jagannathan", subject: "GMAT Quant", experience: "20 years", qualification: "Wharton MBA, IIT Madras B.Tech", image: "", bio: "A Wharton MBA graduate, Prof. Jagannathan brings real-world experience from McKinsey and Goldman Sachs to GMAT preparation. His approach to Data Sufficiency — what he calls the 'Elimination Framework' — is credited with an average 80-point improvement in students' quant scores.", specializations: ["Data Sufficiency", "Problem Solving", "Word Problems", "Advanced Quant"] },
      { name: "Prof. Priya Menon", subject: "GMAT Verbal", experience: "15 years", qualification: "Columbia University MA, National Law School Bangalore", image: "", bio: "Prof. Menon's legal background gives her a unique edge in teaching Critical Reasoning. Her Sentence Correction methods break down complex grammar rules into memorable patterns. She has personally coached 500+ students to 700+ GMAT scores.", specializations: ["Sentence Correction", "Critical Reasoning", "Reading Comprehension", "Argument Analysis"] },
      { name: "Prof. Siddharth Rao", subject: "Admissions Consulting", experience: "10 years", qualification: "Stanford MBA, IIT Delhi", image: "", bio: "With his Stanford MBA and experience as an admissions committee reader, Prof. Rao offers insider perspective on what top B-schools look for. He has helped 300+ students gain admission to M7 schools with over ₹50 crore in scholarships secured for his students.", specializations: ["School Selection", "Essay Strategy", "Interview Preparation", "Scholarship Applications"] },
    ],
    testimonials: [
      { id: "t9", name: "Vikram Iyer", exam: "GMAT 2025", score: "760", text: "Endeavor's GMAT program is world-class. The faculty's approach to Data Sufficiency and CR was transformative — I went from scoring 650 to 760 in just 3 months. Prof. Arun's quant strategies and Prof. Priya's verbal techniques are simply the best in the business. Got into Wharton with a full scholarship!", year: 2025, collegePlaced: "Wharton School, UPenn", photo: "" },
      { id: "t10", name: "Anita Deshmukh", exam: "GMAT 2025", score: "740", text: "The admissions consulting service was invaluable. From essay review to interview prep, Endeavor covered everything. Prof. Siddharth's insights into what Stanford looks for helped me craft a compelling narrative. His feedback on my essays was incredibly detailed and led to 3 admits from M7 schools.", year: 2025, collegePlaced: "Stanford GSB", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 1200, selections: 1092, topPercentile: 180, iimCalls: 0 },
      { year: 2024, totalStudents: 1000, selections: 910, topPercentile: 150, iimCalls: 0 },
    ],
  },
  {
    id: "6", name: "CL Educate (GRE Division)", slug: "cl-gre", category: "gre-toefl",
    location: "Pune, Maharashtra", city: "Pune", state: "Maharashtra", rating: 4.4, reviewCount: 195, fees: "₹28,000", feesNum: 28000,
    image: "", featured: false, established: 2005, students: "15,000+", successRate: "86%", mode: "Online",
    discount: "10% Combo Discount on GRE+TOEFL", offer: "Free university shortlisting session",
    description: "CL Educate's GRE Division offers focused preparation for GRE and TOEFL, designed for students targeting top US and European MBA programs. Their comprehensive online platform provides flexible learning with live doubt resolution and a vast library of practice resources.",
    highlights: ["GRE + TOEFL Combo Programs", "Flexible Online Learning", "Score Improvement Guarantee", "Application Guidance", "Study Abroad Counseling", "University Shortlisting"],
    courses: [
      { id: "c16", name: "GRE Complete", duration: "3 months", fees: "₹28,000", feesNum: 28000, mode: "Online", curriculum: ["GRE Quant — Full Syllabus Coverage", "GRE Verbal & Vocabulary — 3000+ Word List", "Analytical Writing — Templates & Practice", "10 Practice Tests with Performance Reports"], batchSize: "25 students", startDate: "Rolling Admissions" },
      { id: "c17", name: "TOEFL Preparation", duration: "2 months", fees: "₹18,000", feesNum: 18000, mode: "Online", curriculum: ["Reading — Academic Passage Strategies", "Listening — Note-Taking Techniques", "Speaking — Response Templates & Practice", "Writing — Integrated & Independent Tasks", "8 Mock Tests"], batchSize: "30 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Sameer Khan", subject: "GRE Verbal", experience: "10 years", qualification: "NYU Graduate, TOEFL 118/120", image: "", bio: "Prof. Khan's experience studying and working in the US gives him practical insights into GRE verbal preparation. His vocabulary mnemonics and word-root methods have become popular study tools among aspirants. He also mentors students on US university applications.", specializations: ["Text Completion", "Sentence Equivalence", "Reading Comprehension", "Vocabulary"] },
      { name: "Prof. Rita Jain", subject: "GRE Quant", experience: "8 years", qualification: "M.Sc Statistics, ISI; GRE 340/340", image: "", bio: "A perfect GRE scorer herself, Prof. Jain knows exactly what it takes to ace the quant section. Her focus on conceptual clarity and efficient problem-solving has helped hundreds of students achieve 165+ in GRE Quant.", specializations: ["Quantitative Comparison", "Data Interpretation", "Algebra", "Geometry"] },
    ],
    testimonials: [
      { id: "t11", name: "Deepak Sinha", exam: "GRE 2025", score: "328/340", text: "Great program for GRE prep. The vocabulary building methods were particularly effective — I learned 3,000+ words using Prof. Khan's mnemonic system. The mock tests accurately predicted my final score. Got into MIT Sloan!", year: 2025, collegePlaced: "MIT Sloan", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 800, selections: 688, topPercentile: 100, iimCalls: 0 },
    ],
  },
  {
    id: "7", name: "MBAGuru", slug: "mbaguru", category: "xat-snap",
    location: "Kolkata, West Bengal", city: "Kolkata", state: "West Bengal", rating: 4.3, reviewCount: 175, fees: "₹26,000", feesNum: 26000,
    image: "", featured: false, established: 2008, students: "12,000+", successRate: "82%", mode: "Offline",
    discount: "10% Festival Season Offer", offer: "Free decision making crash course module",
    description: "MBAGuru is a specialized coaching institute for XAT, SNAP, and other non-CAT MBA entrance exams. They provide focused preparation for students targeting XLRI, SIBM, and other premier B-schools beyond the IIM ecosystem. Their expertise in Decision Making — the unique section of XAT — sets them apart.",
    highlights: ["XAT & SNAP Specialists", "XLRI Expert Faculty", "Decision Making Masterclass", "Affordable Pricing", "Small Batch Sizes", "Personalized Mentoring"],
    courses: [
      { id: "c18", name: "XAT Focused Program", duration: "6 months", fees: "₹26,000", feesNum: 26000, mode: "Offline", curriculum: ["Decision Making — Case-based, Ethical, Analytical Scenarios", "Quantitative Aptitude — XAT Pattern Focus", "Verbal & Logical Ability — Analogies, Para Formation", "General Knowledge & Current Affairs", "Essay Writing — Weekly Practice with Expert Feedback", "12 Mock XATs with Detailed Analysis"], batchSize: "20 students", startDate: "June 2026" },
      { id: "c19", name: "SNAP Crash Course", duration: "3 months", fees: "₹15,000", feesNum: 15000, mode: "Hybrid", curriculum: ["General English — Grammar, Vocabulary, RC", "Quantitative/DI/DS — Speed Techniques", "Analytical & Logical Reasoning", "Current Affairs — Daily Updates", "8 Mock SNAPs"], batchSize: "25 students", startDate: "August 2026" },
    ],
    faculty: [
      { name: "Prof. Amitava Roy", subject: "Decision Making", experience: "14 years", qualification: "XLRI Jamshedpur Alumni, Former HR Head", image: "", bio: "An XLRI alumnus, Prof. Roy spent 15 years in corporate HR before turning to teaching. His real-world experience makes Decision Making classes incredibly practical. He uses actual business cases and ethical dilemmas to train students, preparing them not just for the exam but for real management challenges.", specializations: ["Ethical Decision Making", "Case Analysis", "Business Scenarios", "Analytical Reasoning"] },
      { name: "Prof. Sonal Das", subject: "General Knowledge & Current Affairs", experience: "9 years", qualification: "MA Political Science, JNU; Former UPSC Aspirant", image: "", bio: "Prof. Das brings her UPSC preparation depth to MBA entrance GK coaching. Her daily current affairs digest and weekly quizzes ensure students are always up-to-date. Her GK sections have helped MBAGuru students score among the top in XAT's GK section.", specializations: ["Indian Economy", "International Relations", "Business & Finance", "Science & Technology"] },
    ],
    testimonials: [
      { id: "t12", name: "Saurabh Banerjee", exam: "XAT 2025", score: "98.5 Percentile", text: "MBAGuru's Decision Making classes are unparalleled. Prof. Roy's use of real business cases and ethical dilemmas prepared me for every type of DM question. The essay writing feedback was detailed and constructive. Got into XLRI BM with their help!", year: 2025, collegePlaced: "XLRI Jamshedpur", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 600, selections: 492, topPercentile: 60, iimCalls: 0 },
    ],
  },
  {
    id: "8", name: "2IIM", slug: "2iim", category: "cat",
    location: "Chennai, Tamil Nadu", city: "Chennai", state: "Tamil Nadu", rating: 4.8, reviewCount: 620, fees: "₹18,000", feesNum: 18000,
    image: "", featured: true, established: 2010, students: "80,000+", successRate: "89%", mode: "Online",
    discount: "10% Referral Discount", offer: "Free YouTube course access + 5 full-length mocks",
    description: "2IIM is an online-first MBA coaching institute founded by IIM alumni that has revolutionized CAT preparation with affordable, high-quality online courses. Known for their exceptional free content on YouTube and their comprehensive paid programs, 2IIM makes top-tier CAT coaching accessible to all. Their concept-first approach ensures deep understanding rather than rote learning.",
    highlights: ["Most Affordable Premium Coaching", "100% Online Learning", "Free YouTube Resources", "IIM Alumni Teachers", "Conceptual Approach to Learning", "80,000+ Students Trained", "Lifetime Course Access"],
    courses: [
      { id: "c20", name: "CAT Online Course", duration: "12 months", fees: "₹18,000", feesNum: 18000, mode: "Online", curriculum: ["700+ Concept Videos — QA, VARC, DILR", "5,000+ Practice Questions with Solutions", "Topic Tests — 50+ Topics Covered", "20 Full-Length Mocks with Detailed Analytics", "Detailed Video Solutions for Every Question"], batchSize: "Unlimited", startDate: "Anytime" },
      { id: "c21", name: "CAT + XAT Online", duration: "12 months", fees: "₹22,000", feesNum: 22000, mode: "Online", curriculum: ["All CAT Content + XAT-Specific Modules", "XAT Decision Making — 50+ Practice Sets", "XAT GK Module — Current Affairs & Static GK", "25 Combined Mocks (CAT + XAT)", "Essay Writing Practice with Feedback"], batchSize: "Unlimited", startDate: "Anytime" },
    ],
    faculty: [
      { name: "Rajesh Balasubramanian", subject: "Quantitative Aptitude & DILR", experience: "15 years", qualification: "IIM Bangalore Alumni, Co-Founder 2IIM", image: "", bio: "Rajesh Sir (as he's fondly called by lakhs of students) is a CAT teaching legend. His YouTube channel with 500,000+ subscribers provides free world-class QA and DILR education. His teaching philosophy — 'If you understand the concept, you can solve any question' — has made 2IIM the most student-loved CAT coaching brand. He personally responds to student doubts on the platform.", specializations: ["Number Theory", "Geometry", "Combinatorics", "Data Interpretation"] },
      { name: "Prof. Bharath S", subject: "Verbal Ability & Reading Comprehension", experience: "10 years", qualification: "IIM Trichy Alumni, Literature Enthusiast", image: "", bio: "Prof. Bharath's passion for reading is infectious. He curates RC passages from diverse sources — from The Economist to academic journals — ensuring students are prepared for any type of passage. His daily reading habit recommendations and vocabulary in context approach have helped thousands of students transform their VARC scores.", specializations: ["Reading Comprehension", "Critical Reasoning", "Para Jumbles", "Summary Questions"] },
    ],
    testimonials: [
      { id: "t13", name: "Divya Krishnan", exam: "CAT 2025", score: "99.7 Percentile", text: "2IIM's online course is the best value in CAT prep — period. Rajesh Sir's QA classes are legendary. I went from being a VARC-only student to cracking QA and DILR, all thanks to the crystal-clear concept videos. Scored 99.7 percentile at just ₹18k! Now at IIM Ahmedabad with a full scholarship.", year: 2025, collegePlaced: "IIM Ahmedabad", photo: "" },
      { id: "t14", name: "Amit Tiwari", exam: "CAT 2025", score: "99.0 Percentile", text: "Started with their free YouTube content, upgraded to the paid course, and never looked back. Pure conceptual learning with zero shortcuts. The mock test analysis was thorough and helped me strategize my attempts section-wise. The affordability meant I could start preparation early without financial stress.", year: 2025, collegePlaced: "IIM Bangalore", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 8000, selections: 7120, topPercentile: 450, iimCalls: 1200 },
      { year: 2024, totalStudents: 7000, selections: 6230, topPercentile: 380, iimCalls: 1000 },
    ],
  },
  // Additional institutes
  {
    id: "9", name: "Unacademy CAT", slug: "unacademy-cat", category: "cat",
    location: "Bangalore, Karnataka", city: "Bangalore", state: "Karnataka", rating: 4.5, reviewCount: 890, fees: "₹24,000", feesNum: 24000,
    image: "", featured: true, established: 2015, students: "1,00,000+", successRate: "80%", mode: "Online",
    discount: "10% App-Only Discount", offer: "7-day free trial + free strategy session",
    description: "Unacademy's CAT coaching division brings India's top MBA entrance exam educators together on one platform. With live classes, recorded content, and an extensive test series, Unacademy offers flexibility and quality at scale. Their unique 'Educator Choice' model lets students learn from multiple top educators.",
    highlights: ["India's Largest Online Platform", "Learn from 10+ Top Educators", "Live + Recorded Classes", "Extensive Test Series", "Mobile-First Learning", "Community Features", "Special Plus Subscription"],
    courses: [
      { id: "c22", name: "CAT Plus Subscription", duration: "12 months", fees: "₹24,000", feesNum: 24000, mode: "Online", curriculum: ["Live Classes — 5 hrs/day", "Recorded Lectures — 1000+ Hours", "25 Full-Length Mocks", "Doubt Resolution in Chat", "Performance Tracking Dashboard"], batchSize: "Unlimited", startDate: "Anytime" },
    ],
    faculty: [
      { name: "Prof. Mohit Gupta", subject: "Quantitative Aptitude", experience: "12 years", qualification: "IIM Ahmedabad Alumni, Ex-McKinsey", image: "", bio: "Prof. Gupta's real-world experience from McKinsey adds a unique dimension to his teaching. Known for his engaging 'Story-based Math' approach, he makes QA concepts memorable through real-life examples.", specializations: ["Arithmetic", "Algebra", "Number Systems", "Geometry"] },
    ],
    testimonials: [
      { id: "t16", name: "Riya Verma", exam: "CAT 2025", score: "97.8 Percentile", text: "Unacademy's flexibility was perfect for my working professional schedule. The live classes were interactive and the recorded content ensured I never fell behind. Great value for money!", year: 2025, collegePlaced: "IIM Shillong", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 15000, selections: 12000, topPercentile: 600, iimCalls: 1500 },
    ],
  },
  {
    id: "10", name: "Mindworkzz", slug: "mindworkzz", category: "cat",
    location: "Noida, Uttar Pradesh", city: "Noida", state: "Uttar Pradesh", rating: 4.6, reviewCount: 240, fees: "₹35,000", feesNum: 35000,
    image: "", featured: false, established: 2003, students: "20,000+", successRate: "87%", mode: "Hybrid",
    discount: "10% Sibling Discount", offer: "Free aptitude assessment test + personalized study plan",
    description: "Mindworkzz, founded by the renowned CAT trainer Arun Sharma, focuses on building strong fundamentals through its unique 'Learn by Doing' approach. Known for Arun Sharma's bestselling QA and DILR books used by millions, Mindworkzz translates that expertise into classroom coaching.",
    highlights: ["Founded by Arun Sharma (Bestselling Author)", "Unique 'Learn by Doing' Methodology", "Published Author Faculty", "Strong Fundamentals Focus", "NCR's Top-Rated Institute"],
    courses: [
      { id: "c23", name: "CAT Elite Program", duration: "10 months", fees: "₹35,000", feesNum: 35000, mode: "Hybrid", curriculum: ["QA by Arun Sharma — From Basics to 99%ile Level", "DILR Comprehensive — Real Exam Pattern", "VARC — Speed & Accuracy Building", "20 Mocks + Sectionals", "Personal Mentoring Sessions"], batchSize: "25 students", startDate: "April 2026" },
    ],
    faculty: [
      { name: "Arun Sharma", subject: "Quantitative Aptitude & DILR", experience: "25 years", qualification: "IIM Bangalore Alumni, Bestselling Author", image: "", bio: "Arun Sharma is a household name in CAT preparation. His books 'How to Prepare for Quantitative Aptitude for CAT' and 'How to Prepare for DILR for CAT' have sold over 5 million copies combined. His personal involvement in teaching at Mindworkzz makes it a unique learning experience.", specializations: ["Complete QA Syllabus", "DILR Strategies", "Mock Test Strategy", "Last-Month Preparation"] },
    ],
    testimonials: [
      { id: "t17", name: "Harsh Pandey", exam: "CAT 2025", score: "99.4 Percentile", text: "Learning QA from Arun Sharma Sir himself was a dream come true. His book was my bible during self-study, and the classroom sessions added a whole new dimension. The personal mentoring helped me develop a winning test strategy.", year: 2025, collegePlaced: "IIM Calcutta", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 2000, selections: 1740, topPercentile: 120, iimCalls: 350 },
    ],
  },
  {
    id: "11", name: "BYJU'S Exam Prep (MBA)", slug: "byjus-mba", category: "cat",
    location: "Bangalore, Karnataka", city: "Bangalore", state: "Karnataka", rating: 4.3, reviewCount: 680, fees: "₹30,000", feesNum: 30000,
    image: "", featured: false, established: 2011, students: "2,00,000+", successRate: "78%", mode: "Online",
    discount: "10% App Purchase Discount", offer: "Free 3-day full access trial",
    description: "BYJU'S Exam Prep (formerly Gradeup) offers tech-driven MBA entrance exam preparation with interactive learning modules, AI-powered practice, and live classes from top educators. Their massive question bank and detailed analytics help students prepare efficiently.",
    highlights: ["AI-Powered Learning", "Massive Question Bank", "Live Classes Daily", "Performance Analytics", "Affordable Pricing", "Mobile App Learning"],
    courses: [
      { id: "c24", name: "CAT Complete Online", duration: "12 months", fees: "₹30,000", feesNum: 30000, mode: "Online", curriculum: ["Daily Live Classes — QA, VARC, DILR", "AI Practice Engine — Adaptive Questions", "30 Full-Length Mocks", "Previous Year Papers Analysis", "GD/PI Prep Module"], batchSize: "Unlimited", startDate: "Anytime" },
    ],
    faculty: [
      { name: "Prof. Abhishek Bansal", subject: "Quantitative Aptitude", experience: "10 years", qualification: "IIM Indore Alumni", image: "", bio: "Prof. Bansal specializes in simplifying complex QA problems into step-by-step solutions. His 'Concept Maps' visual approach to topics like P&C and Probability has become a hallmark of BYJU'S MBA prep content.", specializations: ["P&C", "Probability", "Arithmetic", "Algebra"] },
    ],
    testimonials: [
      { id: "t18", name: "Pooja Reddy", exam: "CAT 2025", score: "96.5 Percentile", text: "The AI-powered practice engine on BYJU'S adjusted difficulty based on my performance, ensuring I was always challenged. The analytics showed me exactly where I stood and what to improve. Great for self-paced learners.", year: 2025, collegePlaced: "NITIE Mumbai", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 25000, selections: 19500, topPercentile: 800, iimCalls: 2000 },
    ],
  },
  {
    id: "12", name: "Hitbullseye", slug: "hitbullseye", category: "mat-cmat",
    location: "Chandigarh, Punjab", city: "Chandigarh", state: "Punjab", rating: 4.4, reviewCount: 320, fees: "₹20,000", feesNum: 20000,
    image: "", featured: false, established: 1999, students: "30,000+", successRate: "84%", mode: "Hybrid",
    discount: "10% Online Course Discount", offer: "Free MAT mock test + career counselling",
    description: "Hitbullseye specializes in MAT, CMAT, and other management entrance tests. They provide affordable coaching for students targeting good MBA colleges beyond the IIM circuit, with a strong focus on building fundamentals and test-taking strategies.",
    highlights: ["MAT & CMAT Specialists", "Affordable Coaching", "Online + Offline Options", "Free Practice Tests", "Career Counselling Support"],
    courses: [
      { id: "c25", name: "MAT Complete Course", duration: "4 months", fees: "₹20,000", feesNum: 20000, mode: "Hybrid", curriculum: ["Language Comprehension", "Mathematical Skills", "Data Analysis & Sufficiency", "Intelligence & Critical Reasoning", "Indian & Global Environment", "10 MAT Mocks"], batchSize: "30 students", startDate: "Rolling Admissions" },
      { id: "c26", name: "CMAT Preparation", duration: "3 months", fees: "₹15,000", feesNum: 15000, mode: "Online", curriculum: ["Quantitative Techniques & Data Interpretation", "Logical Reasoning", "Language Comprehension", "General Awareness", "Innovation & Entrepreneurship", "8 CMAT Mocks"], batchSize: "25 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Anil Kapur", subject: "Mathematical Skills", experience: "15 years", qualification: "M.Sc Mathematics, Delhi University", image: "", bio: "Prof. Kapur's strength lies in making math accessible to students from non-engineering backgrounds. His patient approach and step-by-step methods are perfect for MAT/CMAT aspirants who may not have a strong quantitative foundation.", specializations: ["Basic Mathematics", "Data Interpretation", "Quantitative Aptitude", "Shortcuts & Tricks"] },
    ],
    testimonials: [
      { id: "t19", name: "Ankit Verma", exam: "MAT 2025", score: "95 Percentile", text: "Hitbullseye's MAT course was comprehensive and well-structured. The faculty simplified complex topics, and the mock tests were very close to the actual exam pattern. Got into FORE School of Management, Delhi!", year: 2025, collegePlaced: "FORE School of Management", photo: "" },
    ],
    results: [
      { year: 2025, totalStudents: 3500, selections: 2940, topPercentile: 200, iimCalls: 0 },
    ],
  },
];

// ===================== NEWS ITEMS =====================
export const newsItems: NewsItem[] = [
  { id: "1", title: "CAT 2026 Registration Begins: Key Dates and Updates", excerpt: "IIM Calcutta releases CAT 2026 notification. Registration window opens from August 2026.", content: "IIM Calcutta has officially released the CAT 2026 notification, marking the beginning of yet another competitive admission season. The registration window will open in August 2026, and aspirants are advised to keep their documents ready. This year, the exam pattern is expected to remain largely unchanged with three sections: VARC, DILR, and QA. Key dates include registration start (August 2026), admit card download (October 2026), and the exam date (November 2026). Aspirants should start preparation early and focus on building strong fundamentals.", date: "Mar 28, 2026", category: "CAT", image: "", author: "MBAHub Editorial", readTime: "5 min" },
  { id: "2", title: "Top 10 MBA Colleges Accepting CAT Score Below 90 Percentile", excerpt: "You don't need a 99 percentile to get into a good B-school. Here's our curated list.", content: "Many aspirants believe that only a 99+ percentile in CAT can open doors to quality MBA programs. However, several reputed B-schools accept students with 80-90 percentile scores. Institutes like TAPMI Manipal, IFMR Chennai, LBSIM Delhi, and Great Lakes Chennai offer excellent MBA programs with lower cutoffs. This article explores 10 such colleges, their fee structure, placement statistics, and why they could be the right fit for aspirants with 80-90 percentile scores.", date: "Mar 27, 2026", category: "Admissions", image: "", author: "MBAHub Editorial", readTime: "8 min" },
  { id: "3", title: "GMAT Focus Edition: Complete Guide to the New Format", excerpt: "GMAC has updated the GMAT format. Understand the changes and preparation strategy.", content: "The GMAT Focus Edition introduces significant changes to the exam pattern. The new format consists of three sections — Quantitative Reasoning, Verbal Reasoning, and Data Insights — with a total duration of 2 hours 15 minutes. The Analytical Writing Assessment has been removed. This guide covers everything you need to know about the new format, including section-wise preparation strategies, score conversion, and how B-schools are adapting their admission criteria.", date: "Mar 26, 2026", category: "GMAT", image: "", author: "MBAHub Editorial", readTime: "10 min" },
  { id: "4", title: "XAT 2026: XLRI Announces Exam Date and Pattern Changes", excerpt: "XLRI has announced that XAT 2026 will be conducted in January with new pattern changes.", content: "XLRI Jamshedpur has announced that XAT 2026 will be conducted on the first Sunday of January 2027. The exam pattern includes changes to the Decision Making section, which will now feature more case-based questions. Aspirants should focus on analytical thinking and ethical decision-making scenarios. This article provides a complete guide to the new XAT pattern, preparation strategy, and important dates.", date: "Mar 25, 2026", category: "XAT", image: "", author: "MBAHub Editorial", readTime: "6 min" },
  { id: "5", title: "How to Build Your MBA Profile: Beyond Test Scores", excerpt: "B-schools look beyond just CAT scores. Learn how to strengthen your profile.", content: "While a high CAT score is crucial, IIMs and top B-schools evaluate candidates holistically. Factors like work experience quality, academic consistency, extracurricular achievements, and community involvement play significant roles. This comprehensive guide helps aspirants understand the weightage of different profile elements and how to strengthen each one, from writing impactful SOPs to preparing for interviews.", date: "Mar 24, 2026", category: "Tips", image: "", author: "MBAHub Editorial", readTime: "12 min" },
  { id: "6", title: "IIM Admission Criteria 2026: Weightage Breakdown", excerpt: "Detailed analysis of how IIMs weigh CAT score, academics, work experience, and diversity.", content: "Each IIM has its own admission criteria and weightage system. This article provides a detailed breakdown of how top IIMs — Ahmedabad, Bangalore, Calcutta, Lucknow, and Indore — evaluate candidates. From CAT score cutoffs to academic performance, work experience, and diversity factors, we cover everything an aspirant needs to know to maximize their chances of getting a call.", date: "Mar 23, 2026", category: "Admissions", image: "", author: "MBAHub Editorial", readTime: "15 min" },
  { id: "7", title: "Best Online CAT Coaching 2026: Comprehensive Comparison", excerpt: "Compare the top online CAT coaching platforms — features, pricing, and student reviews.", content: "With the rise of online learning, CAT aspirants now have multiple high-quality online coaching options. This article compares the top online CAT coaching platforms including 2IIM, Unacademy, BYJU's Exam Prep, and IMS Online, based on content quality, faculty, mock tests, pricing, and student satisfaction.", date: "Mar 22, 2026", category: "Reviews", image: "", author: "MBAHub Editorial", readTime: "10 min" },
  { id: "8", title: "SNAP 2026: Registration, Exam Pattern, and Preparation Tips", excerpt: "Everything you need to know about SNAP 2026 for Symbiosis admissions.", content: "SNAP (Symbiosis National Aptitude Test) is the gateway to Symbiosis B-schools including SIBM Pune, SCMHRD, and SIIB. This article covers the SNAP 2026 exam pattern, registration process, important dates, and section-wise preparation strategy.", date: "Mar 21, 2026", category: "SNAP", image: "", author: "MBAHub Editorial", readTime: "7 min" },
];

// ===================== ANNOUNCEMENTS =====================
export const announcements: Announcement[] = [
  { id: "a1", title: "CAT 2026 Registration Opens Soon", description: "IIM Calcutta to release CAT 2026 notification in August. Start your preparation now!", type: "urgent", date: "Mar 28, 2026" },
  { id: "a2", title: "Early Bird Discount: Save 10% on All Courses", description: "Enroll before April 30th and get flat 10% off on any coaching program listed on MBAHub.", type: "success", date: "Mar 27, 2026" },
  { id: "a3", title: "Free CAT Mock Test Available", description: "Take a free full-length CAT mock test to assess your current preparation level.", type: "info", date: "Mar 26, 2026" },
  { id: "a4", title: "XAT 2026 Date Announced", description: "XLRI confirms XAT 2026 in January 2027. Start Decision Making preparation early.", type: "urgent", date: "Mar 25, 2026" },
];

// ===================== CITIES & STATES =====================
export const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Chandigarh", "Noida", "Jaipur", "Lucknow", "Ahmedabad"];

export const states = ["Maharashtra", "Delhi", "Karnataka", "Telangana", "Tamil Nadu", "Punjab", "West Bengal", "Uttar Pradesh", "Rajasthan", "Gujarat"];

// ===================== MBA COLLEGES =====================
export const mbaColleges: MBACollege[] = [
  // IIMs
  { id: "mc1", name: "IIM Ahmedabad", slug: "iim-ahmedabad", city: "Ahmedabad", state: "Gujarat", type: "IIM", ranking: 1, fees: "₹23,00,000", avgPackage: "₹32,00,000", examsAccepted: ["CAT"], courses: ["PGP", "PGP-FABM", "ePGP"] },
  { id: "mc2", name: "IIM Bangalore", slug: "iim-bangalore", city: "Bangalore", state: "Karnataka", type: "IIM", ranking: 2, fees: "₹23,00,000", avgPackage: "₹33,00,000", examsAccepted: ["CAT"], courses: ["PGP", "PGPEM", "PGPBA"] },
  { id: "mc3", name: "IIM Calcutta", slug: "iim-calcutta", city: "Kolkata", state: "West Bengal", type: "IIM", ranking: 3, fees: "₹27,00,000", avgPackage: "₹35,00,000", examsAccepted: ["CAT"], courses: ["PGDM", "MBAEx", "PGPEX-VLM"] },
  { id: "mc4", name: "IIM Lucknow", slug: "iim-lucknow", city: "Lucknow", state: "Uttar Pradesh", type: "IIM", ranking: 4, fees: "₹19,25,000", avgPackage: "₹28,00,000", examsAccepted: ["CAT"], courses: ["PGP", "PGP-ABM", "PGP-SM"] },
  { id: "mc5", name: "IIM Kozhikode", slug: "iim-kozhikode", city: "Kozhikode", state: "Kerala", type: "IIM", ranking: 5, fees: "₹20,50,000", avgPackage: "₹27,50,000", examsAccepted: ["CAT"], courses: ["PGP", "PGP-Liberal Studies", "PGP-Finance"] },
  { id: "mc6", name: "IIM Indore", slug: "iim-indore", city: "Indore", state: "Madhya Pradesh", type: "IIM", ranking: 6, fees: "₹17,70,000", avgPackage: "₹25,00,000", examsAccepted: ["CAT"], courses: ["PGP", "IPM", "PGP-HRM"] },

  // Top Management
  { id: "mc7", name: "XLRI Jamshedpur", slug: "xlri-jamshedpur", city: "Jamshedpur", state: "Jharkhand", type: "Top Management", ranking: 7, fees: "₹25,00,000", avgPackage: "₹28,00,000", examsAccepted: ["XAT", "GMAT"], courses: ["BM", "HRM", "GMP"] },
  { id: "mc8", name: "FMS Delhi", slug: "fms-delhi", city: "Delhi", state: "Delhi", type: "Top Management", ranking: 8, fees: "₹1,92,000", avgPackage: "₹32,00,000", examsAccepted: ["CAT"], courses: ["MBA", "MBA-Part Time"] },
  { id: "mc9", name: "MDI Gurgaon", slug: "mdi-gurgaon", city: "Gurgaon", state: "Haryana", type: "Top Management", ranking: 9, fees: "₹21,34,000", avgPackage: "₹25,00,000", examsAccepted: ["CAT", "GMAT"], courses: ["PGDM", "PGDM-HRM", "PGDM-IB"] },
  { id: "mc10", name: "SPJIMR Mumbai", slug: "spjimr-mumbai", city: "Mumbai", state: "Maharashtra", type: "Top Management", ranking: 10, fees: "₹19,00,000", avgPackage: "₹30,00,000", examsAccepted: ["CAT", "GMAT"], courses: ["PGDM", "PGMPW"] },
  { id: "mc11", name: "JBIMS Mumbai", slug: "jbims-mumbai", city: "Mumbai", state: "Maharashtra", type: "Top Management", ranking: 11, fees: "₹5,50,000", avgPackage: "₹27,00,000", examsAccepted: ["CAT"], courses: ["MMS"] },
  { id: "mc12", name: "IIFT Delhi", slug: "iift-delhi", city: "Delhi", state: "Delhi", type: "Top Management", ranking: 12, fees: "₹20,60,000", avgPackage: "₹26,00,000", examsAccepted: ["IIFT Entrance"], courses: ["MBA-IB"] },

  // PGDM Colleges
  { id: "mc13", name: "SIBM Pune", slug: "sibm-pune", city: "Pune", state: "Maharashtra", type: "PGDM", ranking: 13, fees: "₹22,00,000", avgPackage: "₹24,00,000", examsAccepted: ["SNAP"], courses: ["MBA", "MBA-Innovation"] },
  { id: "mc14", name: "SCMHRD Pune", slug: "scmhrd-pune", city: "Pune", state: "Maharashtra", type: "PGDM", ranking: 15, fees: "₹20,00,000", avgPackage: "₹22,00,000", examsAccepted: ["SNAP"], courses: ["MBA", "MBA-Infrastructure"] },
  { id: "mc15", name: "NMIMS Mumbai", slug: "nmims-mumbai", city: "Mumbai", state: "Maharashtra", type: "PGDM", ranking: 14, fees: "₹21,00,000", avgPackage: "₹23,00,000", examsAccepted: ["NMAT"], courses: ["MBA", "MBA-HR", "MBA-Capital Markets"] },
  { id: "mc16", name: "Great Lakes Chennai", slug: "great-lakes-chennai", city: "Chennai", state: "Tamil Nadu", type: "PGDM", ranking: 16, fees: "₹18,50,000", avgPackage: "₹18,00,000", examsAccepted: ["CAT", "XAT", "GMAT"], courses: ["PGPM", "PGDM"] },
  { id: "mc17", name: "IMT Ghaziabad", slug: "imt-ghaziabad", city: "Ghaziabad", state: "Uttar Pradesh", type: "PGDM", ranking: 17, fees: "₹17,56,000", avgPackage: "₹16,00,000", examsAccepted: ["CAT", "GMAT", "XAT"], courses: ["PGDM", "PGDM-Marketing", "PGDM-Finance"] },
  { id: "mc18", name: "TAPMI Manipal", slug: "tapmi-manipal", city: "Manipal", state: "Karnataka", type: "PGDM", ranking: 18, fees: "₹18,00,000", avgPackage: "₹15,50,000", examsAccepted: ["CAT", "XAT", "GMAT"], courses: ["PGDM", "PGDM-BKFS"] },

  // University
  { id: "mc19", name: "FORE School of Management", slug: "fore-delhi", city: "Delhi", state: "Delhi", type: "University", ranking: 19, fees: "₹16,96,000", avgPackage: "₹14,50,000", examsAccepted: ["CAT", "XAT", "GMAT"], courses: ["PGDM", "PGDM-IB"] },
  { id: "mc20", name: "LBSIM Delhi", slug: "lbsim-delhi", city: "Delhi", state: "Delhi", type: "University", ranking: 20, fees: "₹12,12,000", avgPackage: "₹14,00,000", examsAccepted: ["CAT"], courses: ["PGDM", "PGDM-Finance"] },
  { id: "mc21", name: "MICA Ahmedabad", slug: "mica-ahmedabad", city: "Ahmedabad", state: "Gujarat", type: "University", ranking: 21, fees: "₹20,38,000", avgPackage: "₹16,00,000", examsAccepted: ["CAT", "XAT", "GMAT", "MICAT"], courses: ["PGDM-Communications"] },
  { id: "mc22", name: "NITIE Mumbai (NITIE)", slug: "nitie-mumbai", city: "Mumbai", state: "Maharashtra", type: "University", ranking: 22, fees: "₹13,69,000", avgPackage: "₹23,00,000", examsAccepted: ["CAT"], courses: ["PGDM", "PGDM-Manufacturing", "MBA"] },
];

// ===================== EXAM DETAILS =====================
export const examDetails: ExamDetail[] = [
  {
    id: "e1", name: "CAT", slug: "cat-exam", fullName: "Common Admission Test",
    conductedBy: "IIMs (on rotation)", frequency: "Once a year (November)", mode: "Computer-Based Test (CBT)",
    duration: "2 hours",
    sections: [
      { name: "Verbal Ability & Reading Comprehension (VARC)", questions: 24, marks: 72 },
      { name: "Data Interpretation & Logical Reasoning (DILR)", questions: 20, marks: 60 },
      { name: "Quantitative Aptitude (QA)", questions: 22, marks: 66 },
    ],
    eligibility: [
      "Bachelor's degree with minimum 50% marks (45% for SC/ST/PwD)",
      "Final year graduation students can also apply",
      "No upper age limit",
    ],
    importantDates: [
      { event: "Registration Starts", date: "August 2026" },
      { event: "Registration Ends", date: "September 2026" },
      { event: "Admit Card", date: "October 2026" },
      { event: "Exam Date", date: "November 2026" },
      { event: "Result Declaration", date: "January 2027" },
    ],
    description: "CAT (Common Admission Test) is India's premier management entrance exam conducted by IIMs on a rotational basis. It is the gateway to 20 IIMs and over 1,200 other B-schools across India. CAT tests a candidate's aptitude in verbal ability, data interpretation, logical reasoning, and quantitative aptitude. Over 2.5 lakh candidates appear for CAT annually, making it one of the most competitive exams globally.",
    topColleges: ["IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIM Lucknow", "IIM Kozhikode", "FMS Delhi", "MDI Gurgaon", "SPJIMR Mumbai", "JBIMS Mumbai", "NITIE Mumbai"],
    registrationLink: "https://iimcat.ac.in",
    previousYearCutoffs: [
      { college: "IIM Ahmedabad", cutoff: "99+ Percentile" },
      { college: "IIM Bangalore", cutoff: "99+ Percentile" },
      { college: "IIM Calcutta", cutoff: "99+ Percentile" },
      { college: "IIM Lucknow", cutoff: "97+ Percentile" },
      { college: "IIM Kozhikode", cutoff: "96+ Percentile" },
      { college: "IIM Indore", cutoff: "95+ Percentile" },
      { college: "FMS Delhi", cutoff: "98+ Percentile" },
      { college: "MDI Gurgaon", cutoff: "95+ Percentile" },
      { college: "SPJIMR Mumbai", cutoff: "95+ Percentile" },
    ],
  },
  {
    id: "e2", name: "XAT", slug: "xat-exam", fullName: "Xavier Aptitude Test",
    conductedBy: "XLRI Jamshedpur", frequency: "Once a year (January)", mode: "Computer-Based Test (CBT)",
    duration: "3 hours",
    sections: [
      { name: "Verbal & Logical Ability (VLA)", questions: 26, marks: 26 },
      { name: "Decision Making (DM)", questions: 21, marks: 21 },
      { name: "Quantitative Aptitude & Data Interpretation (QA-DI)", questions: 27, marks: 27 },
      { name: "General Knowledge (GK)", questions: 25, marks: 25 },
    ],
    eligibility: [
      "Bachelor's degree in any discipline",
      "Final year students can apply",
      "No minimum percentage required",
      "No age limit",
    ],
    importantDates: [
      { event: "Registration Starts", date: "August 2026" },
      { event: "Registration Ends", date: "November 2026" },
      { event: "Admit Card", date: "December 2026" },
      { event: "Exam Date", date: "January 2027" },
      { event: "Result Declaration", date: "February 2027" },
    ],
    description: "XAT (Xavier Aptitude Test) is conducted by XLRI Jamshedpur and is the gateway to XLRI and over 150 other B-schools across India. XAT is unique among MBA entrance exams for its Decision Making section, which tests analytical and ethical reasoning abilities. The GK section is also a distinguishing feature. XAT is taken by approximately 1 lakh candidates annually.",
    topColleges: ["XLRI Jamshedpur", "SPJIMR Mumbai", "IMT Ghaziabad", "Great Lakes Chennai", "TAPMI Manipal", "FORE Delhi", "LBSIM Delhi", "BIMTECH Greater Noida", "XISS Ranchi"],
    registrationLink: "https://xatonline.in",
    previousYearCutoffs: [
      { college: "XLRI BM", cutoff: "96+ Percentile" },
      { college: "XLRI HRM", cutoff: "93+ Percentile" },
      { college: "IMT Ghaziabad", cutoff: "85+ Percentile" },
      { college: "Great Lakes", cutoff: "80+ Percentile" },
      { college: "TAPMI Manipal", cutoff: "80+ Percentile" },
    ],
  },
  {
    id: "e3", name: "GMAT", slug: "gmat-exam", fullName: "Graduate Management Admission Test",
    conductedBy: "GMAC (Graduate Management Admission Council)", frequency: "Year-round (by appointment)", mode: "Computer-Based Adaptive Test",
    duration: "2 hours 15 minutes (Focus Edition)",
    sections: [
      { name: "Quantitative Reasoning", questions: 21, marks: 45 },
      { name: "Verbal Reasoning", questions: 23, marks: 45 },
      { name: "Data Insights", questions: 20, marks: 45 },
    ],
    eligibility: [
      "Bachelor's degree from recognized university",
      "No minimum marks requirement",
      "Minimum 18 years of age",
      "Can be taken up to 5 times in a 12-month period",
    ],
    importantDates: [
      { event: "Registration", date: "Year-round" },
      { event: "Exam Availability", date: "Throughout the year" },
      { event: "Score Validity", date: "5 years from exam date" },
    ],
    description: "GMAT (Graduate Management Admission Test) is the most widely accepted exam for MBA admissions globally. Conducted by GMAC, the GMAT Focus Edition consists of three sections: Quantitative Reasoning, Verbal Reasoning, and Data Insights. The exam uses computer-adaptive technology, adjusting question difficulty based on performance. GMAT scores are accepted by over 7,700 programs at approximately 2,400 universities and institutions worldwide.",
    topColleges: ["Harvard Business School", "Stanford GSB", "Wharton (UPenn)", "MIT Sloan", "Columbia Business School", "Chicago Booth", "INSEAD", "London Business School", "ISB Hyderabad", "IIM Ahmedabad (PGPX)"],
    registrationLink: "https://www.mba.com/exams/gmat-focus-edition",
    previousYearCutoffs: [
      { college: "Harvard Business School", cutoff: "730+" },
      { college: "Stanford GSB", cutoff: "740+" },
      { college: "Wharton", cutoff: "730+" },
      { college: "ISB Hyderabad", cutoff: "680+" },
      { college: "IIM Ahmedabad PGPX", cutoff: "700+" },
    ],
  },
  {
    id: "e4", name: "SNAP", slug: "snap-exam", fullName: "Symbiosis National Aptitude Test",
    conductedBy: "Symbiosis International University", frequency: "Once a year (December)", mode: "Computer-Based Test (CBT)",
    duration: "1 hour",
    sections: [
      { name: "General English", questions: 15, marks: 15 },
      { name: "Quantitative, Data Interpretation & Data Sufficiency", questions: 20, marks: 20 },
      { name: "Analytical & Logical Reasoning", questions: 25, marks: 25 },
    ],
    eligibility: [
      "Bachelor's degree (minimum 50%, 45% for SC/ST)",
      "Must register for at least one Symbiosis institute",
      "No upper age limit",
    ],
    importantDates: [
      { event: "Registration Starts", date: "August 2026" },
      { event: "Registration Ends", date: "November 2026" },
      { event: "Exam Date (Test 1)", date: "December 2026" },
      { event: "Exam Date (Test 2)", date: "December 2026" },
      { event: "Result Declaration", date: "January 2027" },
    ],
    description: "SNAP (Symbiosis National Aptitude Test) is the gateway to MBA programs at Symbiosis International University's institutes including SIBM Pune, SCMHRD, SIIB, SIMS, and others. The exam is relatively shorter at 60 minutes and tests general English, quantitative skills, and logical reasoning. SNAP offers multiple test dates, and the best score is considered for admissions.",
    topColleges: ["SIBM Pune", "SCMHRD Pune", "SIIB Pune", "SIMS Pune", "SIBM Hyderabad", "SIBM Bangalore"],
    registrationLink: "https://www.snaptest.org",
    previousYearCutoffs: [
      { college: "SIBM Pune", cutoff: "95+ Percentile" },
      { college: "SCMHRD Pune", cutoff: "92+ Percentile" },
      { college: "SIIB Pune", cutoff: "85+ Percentile" },
    ],
  },
  {
    id: "e5", name: "MAT", slug: "mat-exam", fullName: "Management Aptitude Test",
    conductedBy: "AIMA (All India Management Association)", frequency: "4 times a year (Feb, May, Sep, Dec)", mode: "PBT / CBT / IBT",
    duration: "2 hours 30 minutes",
    sections: [
      { name: "Language Comprehension", questions: 40, marks: 40 },
      { name: "Mathematical Skills", questions: 40, marks: 40 },
      { name: "Data Analysis & Sufficiency", questions: 40, marks: 40 },
      { name: "Intelligence & Critical Reasoning", questions: 40, marks: 40 },
      { name: "Indian & Global Environment", questions: 40, marks: 40 },
    ],
    eligibility: [
      "Bachelor's degree in any discipline",
      "Final year students can apply",
      "No minimum percentage required",
    ],
    importantDates: [
      { event: "Registration (May session)", date: "April 2026" },
      { event: "Exam Date", date: "May 2026" },
      { event: "Result", date: "Within 2 weeks of exam" },
    ],
    description: "MAT (Management Aptitude Test) is conducted by AIMA and is accepted by over 600 B-schools across India. It is considered one of the easier MBA entrance exams compared to CAT or XAT, making it ideal for aspirants targeting mid-tier MBA colleges. MAT is offered in multiple sessions throughout the year, giving students flexibility in choosing their exam date.",
    topColleges: ["BIMTECH Greater Noida", "AIMS Bangalore", "Balaji Institute (BIMM)", "Christ University", "Alliance University", "Amity University"],
    registrationLink: "https://mat.aima.in",
    previousYearCutoffs: [
      { college: "BIMTECH", cutoff: "700+ Composite Score" },
      { college: "Christ University", cutoff: "600+ Composite Score" },
    ],
  },
];
