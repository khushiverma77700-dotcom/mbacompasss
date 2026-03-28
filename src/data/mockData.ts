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
};

export type Testimonial = {
  id: string;
  name: string;
  exam: string;
  score: string;
  text: string;
  year: number;
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
  date: string;
  category: string;
  image: string;
};

export type Announcement = {
  id: string;
  title: string;
  description: string;
  type: "urgent" | "info" | "success";
  date: string;
};

export const categories: Category[] = [
  { id: "1", name: "CAT Coaching", slug: "cat", icon: "Target", count: 85, color: "cat-mba", description: "Prepare for Common Admission Test for IIMs" },
  { id: "2", name: "GMAT Preparation", slug: "gmat", icon: "Globe", count: 42, color: "cat-mba", description: "Get ready for global MBA admissions" },
  { id: "3", name: "XAT & SNAP", slug: "xat-snap", icon: "BookOpen", count: 55, color: "cat-mba", description: "Xavier & Symbiosis entrance coaching" },
  { id: "4", name: "GRE & TOEFL", slug: "gre-toefl", icon: "Languages", count: 38, color: "cat-mba", description: "Study abroad test preparation" },
  { id: "5", name: "MAT & CMAT", slug: "mat-cmat", icon: "BarChart3", count: 60, color: "cat-mba", description: "Management aptitude test coaching" },
  { id: "6", name: "Interview Prep", slug: "interview", icon: "Users", count: 30, color: "cat-mba", description: "GD/PI preparation for B-school admissions" },
];

export const institutes: Institute[] = [
  {
    id: "1", name: "IMS Learning Resources", slug: "ims-learning", category: "cat",
    location: "Mumbai, Maharashtra", city: "Mumbai", rating: 4.8, reviewCount: 342, fees: "₹45,000", feesNum: 45000,
    image: "", featured: true, established: 1977, students: "50,000+", successRate: "92%",
    discount: "10% Early Bird Discount",
    description: "IMS Learning Resources is one of India's premier coaching institutes for MBA entrance exams. With over 45 years of experience, IMS has been the launchpad for thousands of IIM aspirants. Their structured pedagogy, comprehensive study material, and personalized mentoring have consistently delivered top percentile results in CAT, XAT, GMAT, and other management entrance exams. IMS boasts a network of 100+ centers across India, making quality MBA preparation accessible nationwide.",
    highlights: ["100+ Centers Pan-India", "45+ Years of Excellence", "Proprietary SimCAT Series", "IIM Alumni Faculty", "Personal Mentoring Program"],
    courses: [
      { id: "c1", name: "CAT Complete Course", duration: "12 months", fees: "₹45,000", feesNum: 45000, mode: "Hybrid", curriculum: ["Quantitative Aptitude", "Verbal Ability & Reading Comprehension", "Data Interpretation & Logical Reasoning", "Mock Tests & Analysis", "GD/PI Preparation"], batchSize: "30-40 students", startDate: "April 2026" },
      { id: "c2", name: "GMAT Prep Program", duration: "6 months", fees: "₹35,000", feesNum: 35000, mode: "Online", curriculum: ["Quantitative Reasoning", "Verbal Reasoning", "Integrated Reasoning", "Analytical Writing", "Practice Tests"], batchSize: "20-25 students", startDate: "May 2026" },
      { id: "c3", name: "XAT + SNAP Combo", duration: "8 months", fees: "₹30,000", feesNum: 30000, mode: "Offline", curriculum: ["Decision Making", "Verbal & Logical Ability", "Quantitative Aptitude", "General Knowledge", "Essay Writing"], batchSize: "25-30 students", startDate: "June 2026" },
      { id: "c4", name: "CAT Crash Course", duration: "3 months", fees: "₹20,000", feesNum: 20000, mode: "Hybrid", curriculum: ["Intensive QA Sessions", "VARC Shortcuts", "DILR Techniques", "15 Full-Length Mocks"], batchSize: "40-50 students", startDate: "August 2026" },
    ],
    faculty: [
      { name: "Prof. Rajesh Sharma", subject: "Quantitative Aptitude", experience: "20 years", qualification: "IIM Ahmedabad Alumni, M.Tech IIT Bombay", image: "" },
      { name: "Prof. Meena Iyer", subject: "Verbal Ability & RC", experience: "15 years", qualification: "MA English Literature, JNU", image: "" },
      { name: "Prof. Atul Verma", subject: "Data Interpretation", experience: "12 years", qualification: "IIM Bangalore Alumni", image: "" },
      { name: "Prof. Sunita Rao", subject: "Logical Reasoning", experience: "10 years", qualification: "ISI Kolkata, B.Tech NIT", image: "" },
    ],
    testimonials: [
      { id: "t1", name: "Arjun Mehta", exam: "CAT 2025", score: "99.5 Percentile", text: "IMS transformed my preparation journey. The SimCAT series and personalized mentoring helped me crack CAT with a 99.5 percentile. Now at IIM Ahmedabad!", year: 2025 },
      { id: "t2", name: "Priya Nair", exam: "CAT 2025", score: "98.8 Percentile", text: "The faculty at IMS are exceptional. Their approach to VARC and DILR gave me an edge that no other coaching could.", year: 2025 },
      { id: "t3", name: "Rahul Singh", exam: "XAT 2025", score: "99.2 Percentile", text: "The XAT-specific modules at IMS were game-changers. Decision Making became my strongest section.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 5200, selections: 4784, topPercentile: 320, iimCalls: 890 },
      { year: 2024, totalStudents: 4800, selections: 4320, topPercentile: 280, iimCalls: 750 },
      { year: 2023, totalStudents: 4500, selections: 3960, topPercentile: 250, iimCalls: 680 },
    ],
  },
  {
    id: "2", name: "Career Launcher", slug: "career-launcher", category: "cat",
    location: "New Delhi", city: "Delhi", rating: 4.7, reviewCount: 520, fees: "₹42,000", feesNum: 42000,
    image: "", featured: true, established: 1995, students: "60,000+", successRate: "90%",
    discount: "10% Group Enrollment Discount",
    description: "Career Launcher is a leading name in MBA test preparation with a track record spanning nearly three decades. Known for their innovative teaching methodology and AI-driven adaptive learning platform, CL has produced countless IIM selections. Their CATALYST test series is widely regarded as the most accurate predictor of CAT performance.",
    highlights: ["AI-Powered Adaptive Learning", "CATALYST Test Series", "200+ Centers Nationwide", "Guaranteed Score Improvement", "Alumni Network of 50,000+"],
    courses: [
      { id: "c5", name: "CAT Classroom Program", duration: "10 months", fees: "₹42,000", feesNum: 42000, mode: "Offline", curriculum: ["Quantitative Aptitude Masterclass", "VARC Advanced", "DILR Strategy Sessions", "30 Full-Length Mocks", "B-School Application Support"], batchSize: "35-40 students", startDate: "April 2026" },
      { id: "c6", name: "CAT Online Live", duration: "8 months", fees: "₹28,000", feesNum: 28000, mode: "Online", curriculum: ["Live Interactive Classes", "Recorded Lectures", "AI-Based Performance Analytics", "20 Mocks + Sectionals"], batchSize: "Unlimited", startDate: "May 2026" },
      { id: "c7", name: "MBA Interview Prep", duration: "2 months", fees: "₹15,000", feesNum: 15000, mode: "Hybrid", curriculum: ["Group Discussion Practice", "Personal Interview Mock", "Current Affairs Modules", "B-School Specific Prep"], batchSize: "15-20 students", startDate: "January 2027" },
    ],
    faculty: [
      { name: "Prof. Gautam Puri", subject: "Quantitative Aptitude", experience: "25 years", qualification: "IIM Calcutta Alumni, Founder CL", image: "" },
      { name: "Prof. Ananya Bhatt", subject: "Verbal Ability", experience: "18 years", qualification: "Oxford University, MA Literature", image: "" },
      { name: "Prof. Vikram Joshi", subject: "DILR", experience: "14 years", qualification: "IIM Lucknow Alumni", image: "" },
    ],
    testimonials: [
      { id: "t4", name: "Sneha Gupta", exam: "CAT 2025", score: "99.3 Percentile", text: "Career Launcher's CATALYST test series was incredibly accurate. My actual CAT score was within 2 percentile of my CATALYST average.", year: 2025 },
      { id: "t5", name: "Aditya Kumar", exam: "CAT 2025", score: "98.5 Percentile", text: "The AI-powered analytics helped me identify my weak areas precisely. Best investment in my MBA preparation.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 6100, selections: 5490, topPercentile: 380, iimCalls: 920 },
      { year: 2024, totalStudents: 5500, selections: 4950, topPercentile: 340, iimCalls: 820 },
      { year: 2023, totalStudents: 5000, selections: 4400, topPercentile: 300, iimCalls: 720 },
    ],
  },
  {
    id: "3", name: "T.I.M.E. Institute", slug: "time-institute", category: "cat",
    location: "Hyderabad, Telangana", city: "Hyderabad", rating: 4.6, reviewCount: 456, fees: "₹38,000", feesNum: 38000,
    image: "", featured: true, established: 1992, students: "40,000+", successRate: "88%",
    discount: "10% Online Course Discount",
    description: "T.I.M.E. (Triumphant Institute of Management Education) is a nationally acclaimed coaching institute offering top-tier MBA entrance preparation. Founded by IIM alumni, T.I.M.E. has established itself as a powerhouse for CAT, XAT, and SNAP preparation with a network spanning 200+ cities across India.",
    highlights: ["Founded by IIM Alumni", "200+ City Network", "AIMCAT Test Series", "Comprehensive Study Material", "Flexible Batch Timings"],
    courses: [
      { id: "c8", name: "CAT + XAT Complete", duration: "10 months", fees: "₹38,000", feesNum: 38000, mode: "Hybrid", curriculum: ["QA Foundation to Advanced", "Verbal Ability Workshops", "LR & DI Intensive", "25 AIMCATs", "GD/PI Training"], batchSize: "30-35 students", startDate: "April 2026" },
      { id: "c9", name: "GMAT Complete Prep", duration: "4 months", fees: "₹25,000", feesNum: 25000, mode: "Online", curriculum: ["GMAT Quant", "GMAT Verbal", "IR & AWA", "10 Full-Length Mocks"], batchSize: "20-25 students", startDate: "Rolling Admissions" },
      { id: "c10", name: "GRE Preparation", duration: "3 months", fees: "₹22,000", feesNum: 22000, mode: "Online", curriculum: ["GRE Quant", "GRE Verbal", "Analytical Writing", "8 Practice Tests"], batchSize: "20 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Ravi Kumar", subject: "Logical Reasoning", experience: "16 years", qualification: "IIM Bangalore Alumni", image: "" },
      { name: "Prof. Lakshmi Devi", subject: "Quantitative Aptitude", experience: "14 years", qualification: "M.Sc Mathematics, ISI", image: "" },
      { name: "Prof. Karthik Reddy", subject: "Verbal Ability", experience: "11 years", qualification: "MA English, Hyderabad University", image: "" },
    ],
    testimonials: [
      { id: "t6", name: "Kavya Sharma", exam: "CAT 2025", score: "99.1 Percentile", text: "T.I.M.E.'s AIMCAT series is hands-down the best mock test series for CAT. The difficulty level and analysis tools are unmatched.", year: 2025 },
      { id: "t7", name: "Rohan Patel", exam: "XAT 2025", score: "98.7 Percentile", text: "The faculty's expertise in XAT-specific Decision Making questions gave me the confidence to ace the exam.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 4200, selections: 3696, topPercentile: 210, iimCalls: 580 },
      { year: 2024, totalStudents: 3800, selections: 3344, topPercentile: 190, iimCalls: 510 },
      { year: 2023, totalStudents: 3500, selections: 3010, topPercentile: 170, iimCalls: 450 },
    ],
  },
  {
    id: "4", name: "Bulls Eye", slug: "bulls-eye", category: "cat",
    location: "Chandigarh, Punjab", city: "Chandigarh", rating: 4.5, reviewCount: 280, fees: "₹32,000", feesNum: 32000,
    image: "", featured: true, established: 1996, students: "35,000+", successRate: "85%",
    discount: "10% Scholarship for Top Scorers",
    description: "Bulls Eye is a respected MBA coaching institute known for its focused approach to CAT and other MBA entrance exam preparation. With strong roots in North India, Bulls Eye has expanded nationally with their quality-first approach and affordable pricing.",
    highlights: ["Affordable Premium Coaching", "Strong North India Presence", "BullsEye Mock Series", "Personal Mentoring", "Free Test Series for Toppers"],
    courses: [
      { id: "c11", name: "CAT Comprehensive", duration: "11 months", fees: "₹32,000", feesNum: 32000, mode: "Offline", curriculum: ["Quantitative Aptitude", "Verbal Ability & RC", "Data Interpretation", "Logical Reasoning", "20 Mock Tests"], batchSize: "25-30 students", startDate: "May 2026" },
      { id: "c12", name: "CAT Weekend Batch", duration: "8 months", fees: "₹25,000", feesNum: 25000, mode: "Offline", curriculum: ["Weekend Intensive Classes", "Weekday Practice Sets", "10 Full Mocks", "Doubt Sessions"], batchSize: "20-25 students", startDate: "June 2026" },
    ],
    faculty: [
      { name: "Prof. Hirdesh Bhatia", subject: "Quantitative Aptitude", experience: "18 years", qualification: "IIM Kozhikode Alumni", image: "" },
      { name: "Prof. Nidhi Malhotra", subject: "Verbal Ability", experience: "12 years", qualification: "MA English, Punjab University", image: "" },
    ],
    testimonials: [
      { id: "t8", name: "Manish Sharma", exam: "CAT 2025", score: "98.2 Percentile", text: "Bulls Eye offers incredible value for money. The quality of coaching rivals institutes charging twice the fees.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 3000, selections: 2550, topPercentile: 150, iimCalls: 380 },
      { year: 2024, totalStudents: 2700, selections: 2295, topPercentile: 130, iimCalls: 330 },
    ],
  },
  {
    id: "5", name: "Endeavor Careers", slug: "endeavor-careers", category: "gmat",
    location: "Bangalore, Karnataka", city: "Bangalore", rating: 4.7, reviewCount: 310, fees: "₹55,000", feesNum: 55000,
    image: "", featured: true, established: 2001, students: "25,000+", successRate: "91%",
    discount: "10% Early Registration Offer",
    description: "Endeavor Careers specializes in GMAT and GRE preparation for students aspiring to study at top global B-schools. Their expert faculty, many of whom are graduates of Ivy League institutions, provide world-class coaching with a focus on achieving 700+ GMAT scores.",
    highlights: ["GMAT 700+ Specialists", "Ivy League Faculty", "Personalized Score Strategy", "Free Profile Evaluation", "Application Essay Support"],
    courses: [
      { id: "c13", name: "GMAT 700+ Program", duration: "5 months", fees: "₹55,000", feesNum: 55000, mode: "Hybrid", curriculum: ["GMAT Quant Advanced", "GMAT Verbal Mastery", "Data Sufficiency", "Critical Reasoning", "15 Full-Length Mocks"], batchSize: "15-20 students", startDate: "Rolling Admissions" },
      { id: "c14", name: "GRE Complete Prep", duration: "4 months", fees: "₹40,000", feesNum: 40000, mode: "Online", curriculum: ["GRE Quantitative", "GRE Verbal", "AWA Training", "Vocabulary Building", "12 Practice Tests"], batchSize: "20 students", startDate: "Rolling Admissions" },
      { id: "c15", name: "MBA Admissions Consulting", duration: "3 months", fees: "₹75,000", feesNum: 75000, mode: "Online", curriculum: ["School Selection Strategy", "Essay Review & Editing", "Resume Building", "Interview Preparation", "Scholarship Applications"], batchSize: "10 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Arun Jagannathan", subject: "GMAT Quant", experience: "20 years", qualification: "Wharton MBA, IIT Madras", image: "" },
      { name: "Prof. Priya Menon", subject: "GMAT Verbal", experience: "15 years", qualification: "Columbia University, MA", image: "" },
      { name: "Prof. Siddharth Rao", subject: "GRE Prep", experience: "10 years", qualification: "Stanford MBA", image: "" },
    ],
    testimonials: [
      { id: "t9", name: "Vikram Iyer", exam: "GMAT 2025", score: "760", text: "Endeavor's GMAT program is world-class. The faculty's approach to Data Sufficiency and CR was transformative. Got into Wharton!", year: 2025 },
      { id: "t10", name: "Anita Deshmukh", exam: "GMAT 2025", score: "740", text: "The admissions consulting service was invaluable. From essay review to interview prep, Endeavor covered everything.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 1200, selections: 1092, topPercentile: 180, iimCalls: 0 },
      { year: 2024, totalStudents: 1000, selections: 910, topPercentile: 150, iimCalls: 0 },
    ],
  },
  {
    id: "6", name: "CL Educate (GRE Division)", slug: "cl-gre", category: "gre-toefl",
    location: "Pune, Maharashtra", city: "Pune", rating: 4.4, reviewCount: 195, fees: "₹28,000", feesNum: 28000,
    image: "", featured: false, established: 2005, students: "15,000+", successRate: "86%",
    discount: "10% Combo Discount on GRE+TOEFL",
    description: "CL Educate's GRE Division offers focused preparation for GRE and TOEFL, designed for students targeting top US and European MBA programs. Their comprehensive online platform provides flexible learning with live doubt resolution.",
    highlights: ["GRE + TOEFL Combo Programs", "Flexible Online Learning", "Score Improvement Guarantee", "Application Guidance", "Study Abroad Counseling"],
    courses: [
      { id: "c16", name: "GRE Complete", duration: "3 months", fees: "₹28,000", feesNum: 28000, mode: "Online", curriculum: ["GRE Quant", "GRE Verbal & Vocabulary", "Analytical Writing", "10 Practice Tests"], batchSize: "25 students", startDate: "Rolling Admissions" },
      { id: "c17", name: "TOEFL Preparation", duration: "2 months", fees: "₹18,000", feesNum: 18000, mode: "Online", curriculum: ["Reading", "Listening", "Speaking", "Writing", "8 Mock Tests"], batchSize: "30 students", startDate: "Rolling Admissions" },
    ],
    faculty: [
      { name: "Prof. Sameer Khan", subject: "GRE Verbal", experience: "10 years", qualification: "NYU Graduate", image: "" },
      { name: "Prof. Rita Jain", subject: "GRE Quant", experience: "8 years", qualification: "M.Sc Statistics, ISI", image: "" },
    ],
    testimonials: [
      { id: "t11", name: "Deepak Sinha", exam: "GRE 2025", score: "328/340", text: "Great program for GRE prep. The vocabulary building methods were particularly effective.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 800, selections: 688, topPercentile: 100, iimCalls: 0 },
    ],
  },
  {
    id: "7", name: "MBAGuru", slug: "mbaguru", category: "xat-snap",
    location: "Kolkata, West Bengal", city: "Kolkata", rating: 4.3, reviewCount: 175, fees: "₹26,000", feesNum: 26000,
    image: "", featured: false, established: 2008, students: "12,000+", successRate: "82%",
    discount: "10% Festival Season Offer",
    description: "MBAGuru is a specialized coaching institute for XAT, SNAP, and other non-CAT MBA entrance exams. They provide focused preparation for students targeting XLRI, SIBM, and other premier B-schools beyond the IIM ecosystem.",
    highlights: ["XAT & SNAP Specialists", "XLRI Expert Faculty", "Decision Making Masterclass", "Affordable Pricing", "Small Batch Sizes"],
    courses: [
      { id: "c18", name: "XAT Focused Program", duration: "6 months", fees: "₹26,000", feesNum: 26000, mode: "Offline", curriculum: ["Decision Making", "Quantitative Aptitude", "Verbal & Logical Ability", "General Knowledge", "Essay Writing", "12 Mock XATs"], batchSize: "20 students", startDate: "June 2026" },
      { id: "c19", name: "SNAP Crash Course", duration: "3 months", fees: "₹15,000", feesNum: 15000, mode: "Hybrid", curriculum: ["General English", "Quantitative/DI/DS", "Analytical & Logical Reasoning", "Current Affairs", "8 Mock SNAPs"], batchSize: "25 students", startDate: "August 2026" },
    ],
    faculty: [
      { name: "Prof. Amitava Roy", subject: "Decision Making", experience: "14 years", qualification: "XLRI Jamshedpur Alumni", image: "" },
      { name: "Prof. Sonal Das", subject: "General Knowledge", experience: "9 years", qualification: "MA Political Science, JNU", image: "" },
    ],
    testimonials: [
      { id: "t12", name: "Saurabh Banerjee", exam: "XAT 2025", score: "98.5 Percentile", text: "MBAGuru's Decision Making classes are unparalleled. Got into XLRI BM with their help.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 600, selections: 492, topPercentile: 60, iimCalls: 0 },
    ],
  },
  {
    id: "8", name: "2IIM", slug: "2iim", category: "cat",
    location: "Chennai, Tamil Nadu", city: "Chennai", rating: 4.8, reviewCount: 620, fees: "₹18,000", feesNum: 18000,
    image: "", featured: true, established: 2010, students: "80,000+", successRate: "89%",
    discount: "10% Referral Discount",
    description: "2IIM is an online-first MBA coaching institute founded by IIM alumni that has revolutionized CAT preparation with affordable, high-quality online courses. Known for their exceptional free content on YouTube and their comprehensive paid programs, 2IIM makes top-tier CAT coaching accessible to all.",
    highlights: ["Most Affordable Premium Coaching", "100% Online Learning", "Free YouTube Resources", "IIM Alumni Teachers", "Conceptual Approach to Learning"],
    courses: [
      { id: "c20", name: "CAT Online Course", duration: "12 months", fees: "₹18,000", feesNum: 18000, mode: "Online", curriculum: ["Concept Videos", "Practice Questions", "Topic Tests", "20 Full Mocks", "Detailed Solutions"], batchSize: "Unlimited", startDate: "Anytime" },
      { id: "c21", name: "CAT + XAT Online", duration: "12 months", fees: "₹22,000", feesNum: 22000, mode: "Online", curriculum: ["All CAT Content", "XAT Decision Making", "XAT GK Module", "25 Combined Mocks"], batchSize: "Unlimited", startDate: "Anytime" },
    ],
    faculty: [
      { name: "Rajesh Balasubramanian", subject: "Quantitative Aptitude & DILR", experience: "15 years", qualification: "IIM Bangalore Alumni", image: "" },
      { name: "Prof. Bharath S", subject: "Verbal Ability", experience: "10 years", qualification: "IIM Trichy Alumni", image: "" },
    ],
    testimonials: [
      { id: "t13", name: "Divya Krishnan", exam: "CAT 2025", score: "99.7 Percentile", text: "2IIM's online course is the best value in CAT prep. Rajesh Sir's QA classes are legendary. Scored 99.7 percentile at just ₹18k!", year: 2025 },
      { id: "t14", name: "Amit Tiwari", exam: "CAT 2025", score: "99.0 Percentile", text: "Started with their free YouTube content, upgraded to the paid course, and never looked back. Pure conceptual learning.", year: 2025 },
    ],
    results: [
      { year: 2025, totalStudents: 8000, selections: 7120, topPercentile: 450, iimCalls: 1200 },
      { year: 2024, totalStudents: 7000, selections: 6230, topPercentile: 380, iimCalls: 1000 },
    ],
  },
];

export const newsItems: NewsItem[] = [
  { id: "1", title: "CAT 2026 Registration Begins: Key Dates and Updates", excerpt: "IIM Calcutta releases CAT 2026 notification. Registration window opens from August 2026. Here's everything you need to know about the application process.", date: "Mar 28, 2026", category: "CAT", image: "" },
  { id: "2", title: "Top 10 MBA Colleges Accepting CAT Score Below 90 Percentile", excerpt: "You don't need a 99 percentile to get into a good B-school. Here's our curated list of reputed MBA colleges with lower cutoffs.", date: "Mar 27, 2026", category: "Admissions", image: "" },
  { id: "3", title: "GMAT Focus Edition: Complete Guide to the New Format", excerpt: "GMAC has updated the GMAT format. Understand the changes, scoring, and preparation strategy for the new GMAT Focus Edition.", date: "Mar 26, 2026", category: "GMAT", image: "" },
  { id: "4", title: "XAT 2026: XLRI Announces Exam Date and Pattern Changes", excerpt: "XLRI has announced that XAT 2026 will be conducted in January. New pattern includes changes to Decision Making section.", date: "Mar 25, 2026", category: "XAT", image: "" },
  { id: "5", title: "How to Build Your MBA Profile: Beyond Test Scores", excerpt: "B-schools look beyond just CAT scores. Learn how to strengthen your profile with work experience, extracurriculars, and community involvement.", date: "Mar 24, 2026", category: "Tips", image: "" },
  { id: "6", title: "IIM Admission Criteria 2026: Weightage Breakdown", excerpt: "Detailed analysis of how IIMs weigh CAT score, academics, work experience, and diversity factors in their admission process.", date: "Mar 23, 2026", category: "Admissions", image: "" },
];

export const announcements: Announcement[] = [
  { id: "a1", title: "CAT 2026 Registration Opens Soon", description: "IIM Calcutta to release CAT 2026 notification in August. Start your preparation now!", type: "urgent", date: "Mar 28, 2026" },
  { id: "a2", title: "Early Bird Discount: Save 10% on All Courses", description: "Enroll before April 30th and get flat 10% off on any coaching program.", type: "success", date: "Mar 27, 2026" },
  { id: "a3", title: "Free CAT Mock Test Available", description: "Take a free full-length CAT mock test to assess your current preparation level.", type: "info", date: "Mar 26, 2026" },
];

export const cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Chandigarh"];
