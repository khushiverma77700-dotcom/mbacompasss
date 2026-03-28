export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
  color: string;
};

export type Institute = {
  id: string;
  name: string;
  slug: string;
  category: string;
  location: string;
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
};

export type Course = {
  id: string;
  name: string;
  duration: string;
  fees: string;
  feesNum: number;
  mode: string;
};

export type Faculty = {
  name: string;
  subject: string;
  experience: string;
};

export type NewsItem = {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
};

export const categories: Category[] = [
  { id: "1", name: "MBA & Management", slug: "mba", icon: "Briefcase", count: 120, color: "cat-mba" },
  { id: "2", name: "Medical (NEET)", slug: "medical", icon: "Heart", count: 95, color: "cat-medical" },
  { id: "3", name: "Engineering (JEE)", slug: "engineering", icon: "Cpu", count: 150, color: "cat-engineering" },
  { id: "4", name: "Government Exams", slug: "government", icon: "Building2", count: 80, color: "cat-government" },
];

export const institutes: Institute[] = [
  {
    id: "1", name: "IMS Learning Resources", slug: "ims-learning", category: "mba",
    location: "Mumbai, Maharashtra", rating: 4.8, reviewCount: 342, fees: "₹45,000", feesNum: 45000,
    image: "", featured: true, established: 1977, students: "50,000+", successRate: "92%",
    description: "IMS Learning Resources is one of India's premier coaching institutes for MBA entrance exams. With decades of experience, IMS offers comprehensive preparation for CAT, GMAT, GRE, and other management entrance exams.",
    courses: [
      { id: "c1", name: "CAT Complete Course", duration: "12 months", fees: "₹45,000", feesNum: 45000, mode: "Hybrid" },
      { id: "c2", name: "GMAT Prep", duration: "6 months", fees: "₹35,000", feesNum: 35000, mode: "Online" },
      { id: "c3", name: "XAT + SNAP Combo", duration: "8 months", fees: "₹30,000", feesNum: 30000, mode: "Offline" },
    ],
    faculty: [
      { name: "Prof. Rajesh Sharma", subject: "Quantitative Aptitude", experience: "20 years" },
      { name: "Prof. Meena Iyer", subject: "Verbal Ability", experience: "15 years" },
    ],
  },
  {
    id: "2", name: "Allen Career Institute", slug: "allen-career", category: "medical",
    location: "Kota, Rajasthan", rating: 4.7, reviewCount: 1205, fees: "₹1,50,000", feesNum: 150000,
    image: "", featured: true, established: 1988, students: "2,00,000+", successRate: "95%",
    description: "Allen Career Institute is a leading coaching center for medical and engineering entrance exams. Known for its rigorous teaching methodology and outstanding results in NEET and JEE.",
    courses: [
      { id: "c4", name: "NEET Complete", duration: "2 years", fees: "₹1,50,000", feesNum: 150000, mode: "Offline" },
      { id: "c5", name: "NEET Crash Course", duration: "6 months", fees: "₹75,000", feesNum: 75000, mode: "Offline" },
      { id: "c6", name: "NEET Online", duration: "1 year", fees: "₹50,000", feesNum: 50000, mode: "Online" },
    ],
    faculty: [
      { name: "Dr. Alok Gupta", subject: "Biology", experience: "25 years" },
      { name: "Dr. Priya Verma", subject: "Chemistry", experience: "18 years" },
    ],
  },
  {
    id: "3", name: "FIITJEE", slug: "fiitjee", category: "engineering",
    location: "New Delhi", rating: 4.6, reviewCount: 890, fees: "₹2,00,000", feesNum: 200000,
    image: "", featured: true, established: 1992, students: "1,50,000+", successRate: "90%",
    description: "FIITJEE is renowned for its JEE preparation programs. Their innovative teaching methods and structured approach have produced thousands of IIT selections.",
    courses: [
      { id: "c7", name: "JEE Advanced 2-Year", duration: "2 years", fees: "₹2,00,000", feesNum: 200000, mode: "Offline" },
      { id: "c8", name: "JEE Mains Crash", duration: "4 months", fees: "₹60,000", feesNum: 60000, mode: "Hybrid" },
      { id: "c9", name: "JEE Foundation", duration: "1 year", fees: "₹80,000", feesNum: 80000, mode: "Online" },
    ],
    faculty: [
      { name: "Prof. D.K. Jha", subject: "Physics", experience: "22 years" },
      { name: "Prof. Sanjay Mishra", subject: "Mathematics", experience: "19 years" },
    ],
  },
  {
    id: "4", name: "Vajiram & Ravi", slug: "vajiram-ravi", category: "government",
    location: "New Delhi", rating: 4.9, reviewCount: 567, fees: "₹70,000", feesNum: 70000,
    image: "", featured: true, established: 1976, students: "30,000+", successRate: "88%",
    description: "Vajiram & Ravi is one of the most trusted names in UPSC Civil Services preparation. Known for their comprehensive coverage and expert faculty.",
    courses: [
      { id: "c10", name: "UPSC CSE Complete", duration: "1 year", fees: "₹70,000", feesNum: 70000, mode: "Offline" },
      { id: "c11", name: "UPSC Prelims Test Series", duration: "6 months", fees: "₹25,000", feesNum: 25000, mode: "Hybrid" },
      { id: "c12", name: "UPSC Interview Prep", duration: "2 months", fees: "₹15,000", feesNum: 15000, mode: "Offline" },
    ],
    faculty: [
      { name: "Sri. K.R. Nambiar", subject: "General Studies", experience: "30 years" },
      { name: "Prof. Anita Singh", subject: "Ethics & Essay", experience: "12 years" },
    ],
  },
  {
    id: "5", name: "T.I.M.E.", slug: "time-institute", category: "mba",
    location: "Hyderabad, Telangana", rating: 4.5, reviewCount: 456, fees: "₹38,000", feesNum: 38000,
    image: "", featured: false, established: 1992, students: "40,000+", successRate: "85%",
    description: "T.I.M.E. is a national level institution for entrance exam training, delivering quality education with innovative teaching methodology.",
    courses: [
      { id: "c13", name: "CAT + XAT", duration: "10 months", fees: "₹38,000", feesNum: 38000, mode: "Hybrid" },
      { id: "c14", name: "GRE Prep", duration: "4 months", fees: "₹22,000", feesNum: 22000, mode: "Online" },
    ],
    faculty: [
      { name: "Prof. Ravi Kumar", subject: "Logical Reasoning", experience: "16 years" },
    ],
  },
  {
    id: "6", name: "Aakash Institute", slug: "aakash-institute", category: "medical",
    location: "New Delhi", rating: 4.6, reviewCount: 980, fees: "₹1,20,000", feesNum: 120000,
    image: "", featured: false, established: 1988, students: "2,50,000+", successRate: "89%",
    description: "Aakash Institute is a leading name in medical and engineering entrance exam preparation, offering comprehensive courses for NEET and JEE.",
    courses: [
      { id: "c15", name: "NEET Repeater", duration: "1 year", fees: "₹1,20,000", feesNum: 120000, mode: "Offline" },
      { id: "c16", name: "NEET Foundation", duration: "2 years", fees: "₹90,000", feesNum: 90000, mode: "Hybrid" },
    ],
    faculty: [
      { name: "Dr. Neha Agarwal", subject: "Physics", experience: "14 years" },
    ],
  },
];

export const newsItems: NewsItem[] = [
  { id: "1", title: "CAT 2026 Registration Begins: Key Dates and Updates", excerpt: "IIM Calcutta releases CAT 2026 notification. Registration window opens from August 2026.", date: "Mar 28, 2026", category: "MBA", image: "" },
  { id: "2", title: "NEET 2026: NTA Announces Revised Exam Pattern", excerpt: "National Testing Agency introduces changes to NEET exam structure for 2026 session.", date: "Mar 27, 2026", category: "Medical", image: "" },
  { id: "3", title: "JEE Advanced 2026: IIT Delhi to Conduct This Year", excerpt: "IIT Delhi confirmed as organizing institute for JEE Advanced 2026 examination.", date: "Mar 27, 2026", category: "Engineering", image: "" },
  { id: "4", title: "UPSC CSE 2026 Prelims: Important Topics to Cover", excerpt: "Expert analysis of most important topics for UPSC Civil Services Preliminary exam.", date: "Mar 26, 2026", category: "Government", image: "" },
  { id: "5", title: "Top MBA Colleges Accept CAT Score Below 90 Percentile", excerpt: "List of reputed B-schools where you can get admission with moderate CAT scores.", date: "Mar 25, 2026", category: "MBA", image: "" },
];
