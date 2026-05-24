// MVP seed for B-School Vocabulary Hub. Inserted into vocab_words via admin/seed action.
// Admin can bulk-upload more via CSV at /admin/vocabulary.

export type VocabCategory = "finance" | "marketing" | "consulting" | "hr" | "economics" | "corp_comm" | "general";
export type VocabDifficulty = "beginner" | "intermediate" | "cat" | "gdpi";

export interface SeedWord {
  word: string;
  part_of_speech: string;
  meaning: string;
  hinglish_meaning?: string;
  synonyms: string[];
  antonyms: string[];
  example_business: string;
  example_interview?: string;
  example_email?: string;
  category: VocabCategory;
  difficulty: VocabDifficulty;
}

export const VOCAB_SEED: SeedWord[] = [
  // FINANCE
  { word: "Amortization", part_of_speech: "noun", meaning: "Gradual repayment of a debt or writing off the cost of an asset over time.", hinglish_meaning: "Loan ya asset ka cost dheere-dheere chukana ya kam karna.", synonyms: ["repayment", "write-off"], antonyms: ["accumulation"], example_business: "The amortization schedule shows monthly principal and interest split for the 5-year loan.", example_interview: "Can you explain how amortization affects the income statement?", category: "finance", difficulty: "intermediate" },
  { word: "Leverage", part_of_speech: "noun", meaning: "Using borrowed capital to increase the potential return of an investment.", hinglish_meaning: "Udhaar ka paisa lekar zyada profit kamane ki strategy.", synonyms: ["gearing", "borrowing"], antonyms: ["equity"], example_business: "High financial leverage amplifies both gains and losses.", category: "finance", difficulty: "cat" },
  { word: "Liquidity", part_of_speech: "noun", meaning: "Ease with which an asset can be converted into cash.", hinglish_meaning: "Asset ko jaldi cash mein badalne ki kshamta.", synonyms: ["cash-flow", "marketability"], antonyms: ["illiquidity"], example_business: "The startup faced a liquidity crunch despite being profitable on paper.", category: "finance", difficulty: "intermediate" },
  { word: "EBITDA", part_of_speech: "noun", meaning: "Earnings before interest, taxes, depreciation, and amortization — a measure of operating performance.", synonyms: ["operating earnings"], antonyms: [], example_business: "Investors track EBITDA margin to compare companies independent of capital structure.", category: "finance", difficulty: "cat" },
  { word: "Hedge", part_of_speech: "verb", meaning: "To protect against potential loss by making offsetting investments.", hinglish_meaning: "Loss se bachne ke liye opposite investment karna.", synonyms: ["safeguard", "insure"], antonyms: ["expose"], example_business: "We hedged the dollar exposure using forward contracts.", category: "finance", difficulty: "intermediate" },
  { word: "Arbitrage", part_of_speech: "noun", meaning: "Simultaneous buying and selling of an asset in different markets to profit from price differences.", synonyms: ["price exploitation"], antonyms: [], example_business: "The trader spotted an arbitrage opportunity between the NSE and BSE listings.", category: "finance", difficulty: "cat" },
  { word: "Yield", part_of_speech: "noun", meaning: "The income return on an investment, expressed as a percentage.", synonyms: ["return", "income"], antonyms: ["loss"], example_business: "The bond's current yield is 7.2% per annum.", category: "finance", difficulty: "beginner" },
  { word: "Volatility", part_of_speech: "noun", meaning: "The rate at which the price of a security increases or decreases.", hinglish_meaning: "Price mein utar-chadhav ki speed.", synonyms: ["fluctuation", "instability"], antonyms: ["stability"], example_business: "Market volatility spiked after the central bank announcement.", category: "finance", difficulty: "intermediate" },

  // MARKETING
  { word: "Positioning", part_of_speech: "noun", meaning: "The place a brand occupies in the consumer's mind relative to competitors.", synonyms: ["brand-placement"], antonyms: [], example_business: "Apple's premium positioning lets it command higher margins.", example_interview: "How would you reposition this product for Gen Z?", category: "marketing", difficulty: "intermediate" },
  { word: "Segmentation", part_of_speech: "noun", meaning: "Dividing a market into distinct groups of buyers with different needs.", synonyms: ["categorization"], antonyms: [], example_business: "Geographic segmentation revealed strong demand in tier-2 cities.", category: "marketing", difficulty: "intermediate" },
  { word: "Churn", part_of_speech: "noun", meaning: "The rate at which customers stop using a product or service.", hinglish_meaning: "Customers ke chhodne ka rate.", synonyms: ["attrition", "drop-off"], antonyms: ["retention"], example_business: "Our monthly churn dropped from 8% to 4% after the onboarding revamp.", category: "marketing", difficulty: "intermediate" },
  { word: "Funnel", part_of_speech: "noun", meaning: "The customer journey from awareness to purchase, visualized as a narrowing shape.", synonyms: ["pipeline"], antonyms: [], example_business: "Top-of-funnel traffic doubled but conversion stayed flat.", category: "marketing", difficulty: "beginner" },
  { word: "Cannibalization", part_of_speech: "noun", meaning: "Loss in sales of an existing product caused by introducing a new product from the same brand.", synonyms: ["self-competition"], antonyms: [], example_business: "The new compact SUV risks cannibalizing our sedan sales.", category: "marketing", difficulty: "cat" },
  { word: "Penetration", part_of_speech: "noun", meaning: "The percentage of a target market that uses a product or service.", synonyms: ["market-share"], antonyms: [], example_business: "Smartphone penetration in India crossed 70% last year.", category: "marketing", difficulty: "intermediate" },

  // CONSULTING
  { word: "Hypothesis", part_of_speech: "noun", meaning: "A proposed explanation to be tested against data.", synonyms: ["assumption", "thesis"], antonyms: ["conclusion"], example_business: "Our initial hypothesis was that pricing — not packaging — drove the slowdown.", example_interview: "Walk me through how you'd structure a hypothesis-driven analysis here.", category: "consulting", difficulty: "intermediate" },
  { word: "MECE", part_of_speech: "adjective", meaning: "Mutually Exclusive, Collectively Exhaustive — a way to organize information without overlap or gaps.", synonyms: ["structured"], antonyms: ["overlapping"], example_business: "The framework breaks revenue levers into a MECE tree.", category: "consulting", difficulty: "cat" },
  { word: "Synergy", part_of_speech: "noun", meaning: "Combined value greater than the sum of individual parts.", hinglish_meaning: "Do cheezein milkar alag-alag se zyada value banayein.", synonyms: ["cooperation"], antonyms: ["dyssynergy"], example_business: "The merger is expected to deliver ₹400 crore in cost synergies.", category: "consulting", difficulty: "intermediate" },
  { word: "Benchmark", part_of_speech: "noun", meaning: "A standard against which performance is measured.", synonyms: ["yardstick", "reference"], antonyms: [], example_business: "We benchmarked our NPS against the industry median.", category: "consulting", difficulty: "beginner" },
  { word: "Pivot", part_of_speech: "verb", meaning: "To fundamentally change strategy in response to new information.", synonyms: ["shift", "redirect"], antonyms: ["persist"], example_business: "The startup pivoted from B2C to B2B SaaS in year two.", example_interview: "Tell me about a time you had to pivot under pressure.", category: "consulting", difficulty: "intermediate" },
  { word: "Bandwidth", part_of_speech: "noun", meaning: "Capacity or available time to handle work.", hinglish_meaning: "Kaam karne ki available capacity ya time.", synonyms: ["capacity"], antonyms: [], example_business: "I don't have the bandwidth to take on a fourth workstream this sprint.", example_email: "Could we revisit this next week? My bandwidth this week is limited.", category: "corp_comm", difficulty: "beginner" },

  // HR
  { word: "Onboarding", part_of_speech: "noun", meaning: "The process of integrating a new employee into an organization.", synonyms: ["induction"], antonyms: ["offboarding"], example_business: "A strong onboarding program cuts time-to-productivity by 40%.", category: "hr", difficulty: "beginner" },
  { word: "Attrition", part_of_speech: "noun", meaning: "Voluntary or involuntary reduction in workforce over time.", hinglish_meaning: "Employees ke job chhodne ki dar.", synonyms: ["turnover", "churn"], antonyms: ["retention"], example_business: "Engineering attrition spiked after the freeze on hikes.", category: "hr", difficulty: "intermediate" },
  { word: "Appraisal", part_of_speech: "noun", meaning: "Formal evaluation of an employee's performance.", synonyms: ["review", "assessment"], antonyms: [], example_business: "Mid-year appraisals will be calibrated across teams.", category: "hr", difficulty: "beginner" },
  { word: "Calibration", part_of_speech: "noun", meaning: "Adjusting ratings to ensure fairness and consistency across teams.", synonyms: ["normalization"], antonyms: [], example_business: "After calibration, only 12% of the team was rated 'exceeds expectations'.", category: "hr", difficulty: "intermediate" },
  { word: "Stakeholder", part_of_speech: "noun", meaning: "Any party with an interest in the success of a project or organization.", synonyms: ["interested-party"], antonyms: [], example_business: "We aligned all stakeholders before the roadmap freeze.", example_email: "Please loop in the key stakeholders before Friday's review.", category: "corp_comm", difficulty: "beginner" },

  // ECONOMICS
  { word: "Inflation", part_of_speech: "noun", meaning: "Sustained increase in the general price level of goods and services.", hinglish_meaning: "Cheezon ke daam mein lagatar badhotri.", synonyms: ["price-rise"], antonyms: ["deflation"], example_business: "Core inflation eased to 4.2% in October.", category: "economics", difficulty: "beginner" },
  { word: "Recession", part_of_speech: "noun", meaning: "A significant decline in economic activity lasting more than a few months.", synonyms: ["downturn", "slump"], antonyms: ["boom"], example_business: "Hiring freezes deepen during a recession.", category: "economics", difficulty: "beginner" },
  { word: "GDP", part_of_speech: "noun", meaning: "Gross Domestic Product — total value of goods and services produced in a country.", synonyms: ["national-output"], antonyms: [], example_business: "India's GDP is forecast to grow at 6.8% this fiscal.", category: "economics", difficulty: "beginner" },
  { word: "Stagflation", part_of_speech: "noun", meaning: "Slow economic growth combined with high inflation and high unemployment.", synonyms: [], antonyms: ["growth"], example_business: "Policymakers fear a return of 1970s-style stagflation.", category: "economics", difficulty: "cat" },
  { word: "Elasticity", part_of_speech: "noun", meaning: "Sensitivity of demand or supply to a change in price.", synonyms: ["responsiveness"], antonyms: ["rigidity"], example_business: "Luxury goods typically show high price elasticity.", category: "economics", difficulty: "intermediate" },
  { word: "Monopoly", part_of_speech: "noun", meaning: "Exclusive control of a market by a single seller.", synonyms: ["sole-control"], antonyms: ["competition"], example_business: "The court ruled the practice violated anti-monopoly laws.", category: "economics", difficulty: "beginner" },

  // CORP_COMM
  { word: "Synergize", part_of_speech: "verb", meaning: "To combine or coordinate efforts for greater effect.", synonyms: ["collaborate"], antonyms: ["work-in-silos"], example_business: "Let's synergize our go-to-market plan with the product team.", example_email: "Looking forward to synergizing with your team next quarter.", category: "corp_comm", difficulty: "intermediate" },
  { word: "Circle back", part_of_speech: "phrase", meaning: "To return to a topic or person later.", hinglish_meaning: "Baad mein wapas baat karna.", synonyms: ["revisit", "follow-up"], antonyms: [], example_business: "Let's circle back on the pricing after legal reviews the contract.", example_email: "I'll circle back tomorrow with the revised numbers.", category: "corp_comm", difficulty: "beginner" },
  { word: "Actionable", part_of_speech: "adjective", meaning: "Able to be acted upon; practical and specific.", synonyms: ["practical"], antonyms: ["vague"], example_business: "The report lacks actionable insights — it's all observation, no recommendation.", category: "corp_comm", difficulty: "intermediate" },
  { word: "Granular", part_of_speech: "adjective", meaning: "Highly detailed; broken down into small parts.", synonyms: ["detailed"], antonyms: ["broad"], example_business: "Can you share a more granular breakdown by region?", category: "corp_comm", difficulty: "intermediate" },
  { word: "Cadence", part_of_speech: "noun", meaning: "The rhythm or frequency at which something occurs.", synonyms: ["rhythm", "frequency"], antonyms: [], example_business: "We follow a weekly cadence for leadership reviews.", example_email: "Let's set up a bi-weekly cadence to track progress.", category: "corp_comm", difficulty: "intermediate" },
  { word: "Holistic", part_of_speech: "adjective", meaning: "Considering the whole rather than isolated parts.", synonyms: ["comprehensive"], antonyms: ["fragmented"], example_business: "We need a holistic view of the customer, not just transaction data.", category: "corp_comm", difficulty: "intermediate" },

  // GDPI-LEVEL VOCAB
  { word: "Disruption", part_of_speech: "noun", meaning: "A radical change that displaces established markets or technologies.", synonyms: ["upheaval"], antonyms: ["status-quo"], example_business: "Generative AI is causing massive disruption across knowledge work.", example_interview: "What is the biggest disruption you foresee in the next decade?", category: "general", difficulty: "gdpi" },
  { word: "Sustainability", part_of_speech: "noun", meaning: "Meeting present needs without compromising future generations.", synonyms: ["viability"], antonyms: ["unsustainability"], example_business: "ESG investors now demand sustainability metrics in every annual report.", category: "general", difficulty: "gdpi" },
  { word: "Globalization", part_of_speech: "noun", meaning: "The increasing interconnection of national economies and cultures.", synonyms: ["internationalization"], antonyms: ["localization"], example_business: "Post-pandemic, globalization is being reshaped into 'friend-shoring'.", category: "general", difficulty: "gdpi" },
  { word: "Demographic dividend", part_of_speech: "phrase", meaning: "Economic growth potential from a young, working-age population.", synonyms: [], antonyms: [], example_business: "India's demographic dividend is a 30-year window we must leverage.", category: "economics", difficulty: "gdpi" },
  { word: "Fiscal deficit", part_of_speech: "phrase", meaning: "When a government's total expenditure exceeds its revenue.", synonyms: ["budget-deficit"], antonyms: ["surplus"], example_business: "The fiscal deficit target is set at 5.1% of GDP this year.", category: "economics", difficulty: "gdpi" },

  // CAT-LEVEL VOCAB
  { word: "Ubiquitous", part_of_speech: "adjective", meaning: "Present, appearing, or found everywhere.", synonyms: ["omnipresent", "pervasive"], antonyms: ["rare", "scarce"], example_business: "Smartphones have become ubiquitous in Indian retail commerce.", category: "general", difficulty: "cat" },
  { word: "Esoteric", part_of_speech: "adjective", meaning: "Intended for or understood by only a small group with specialized knowledge.", synonyms: ["arcane", "obscure"], antonyms: ["common", "popular"], example_business: "His esoteric trading strategies confused the rest of the analyst team.", category: "general", difficulty: "cat" },
  { word: "Pragmatic", part_of_speech: "adjective", meaning: "Dealing with things sensibly and realistically.", synonyms: ["practical", "realistic"], antonyms: ["idealistic"], example_business: "We took a pragmatic approach: launch in 2 cities first, learn, then scale.", category: "general", difficulty: "intermediate" },
  { word: "Ambiguous", part_of_speech: "adjective", meaning: "Open to more than one interpretation; unclear.", synonyms: ["vague", "unclear"], antonyms: ["clear", "definitive"], example_business: "The contract clause was ambiguous and triggered the dispute.", category: "general", difficulty: "intermediate" },
  { word: "Catalyst", part_of_speech: "noun", meaning: "A person or thing that precipitates change.", synonyms: ["trigger", "stimulus"], antonyms: ["inhibitor"], example_business: "UPI was the catalyst for India's digital payments revolution.", category: "general", difficulty: "intermediate" },
  { word: "Mitigate", part_of_speech: "verb", meaning: "To make less severe or serious.", synonyms: ["alleviate", "reduce"], antonyms: ["aggravate"], example_business: "We bought currency forwards to mitigate FX risk.", category: "general", difficulty: "intermediate" },
  { word: "Scrutinize", part_of_speech: "verb", meaning: "To examine or inspect closely and thoroughly.", synonyms: ["examine", "inspect"], antonyms: ["overlook"], example_business: "The board scrutinized every line item of the proposed budget.", category: "general", difficulty: "intermediate" },
  { word: "Lucrative", part_of_speech: "adjective", meaning: "Producing a great deal of profit.", synonyms: ["profitable", "remunerative"], antonyms: ["unprofitable"], example_business: "The premium segment proved more lucrative than mass market.", category: "general", difficulty: "intermediate" },
  { word: "Astute", part_of_speech: "adjective", meaning: "Having or showing shrewd judgment.", synonyms: ["shrewd", "sharp"], antonyms: ["naive"], example_business: "An astute investor anticipated the rate cut six months early.", category: "general", difficulty: "cat" },
  { word: "Prudent", part_of_speech: "adjective", meaning: "Acting with care and thought for the future.", synonyms: ["cautious", "judicious"], antonyms: ["reckless"], example_business: "It would be prudent to maintain a 6-month cash runway.", category: "finance", difficulty: "intermediate" },

  // BEGINNER
  { word: "Revenue", part_of_speech: "noun", meaning: "Total income generated by a business from its operations.", synonyms: ["sales", "turnover"], antonyms: ["expense"], example_business: "Q3 revenue grew 22% year-on-year.", category: "finance", difficulty: "beginner" },
  { word: "Profit", part_of_speech: "noun", meaning: "Money left after all expenses are subtracted from revenue.", synonyms: ["earnings", "gain"], antonyms: ["loss"], example_business: "Net profit margin expanded to 14% this quarter.", category: "finance", difficulty: "beginner" },
  { word: "Equity", part_of_speech: "noun", meaning: "Ownership interest in a company, represented by shares.", synonyms: ["ownership"], antonyms: ["debt"], example_business: "The founder retains 32% equity after the Series B.", category: "finance", difficulty: "beginner" },
  { word: "Asset", part_of_speech: "noun", meaning: "A resource owned by a business with economic value.", synonyms: ["resource", "holding"], antonyms: ["liability"], example_business: "Intangible assets like brand and IP now exceed physical ones.", category: "finance", difficulty: "beginner" },
  { word: "Liability", part_of_speech: "noun", meaning: "A financial obligation or debt owed by a business.", synonyms: ["debt", "obligation"], antonyms: ["asset"], example_business: "Long-term liabilities rose due to the new bond issue.", category: "finance", difficulty: "beginner" },
];

export function slugifyWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
