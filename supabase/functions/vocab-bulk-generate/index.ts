// Bulk-generate unique MBA vocabulary words via Lovable AI.
// POST { count, category?, difficulty? } -> creates job, runs in background, returns { job_id }
// GET ?job_id=...                         -> returns job row
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CATEGORIES = ["finance","marketing","consulting","hr","economics","corp_comm","general"];
const DIFFICULTIES = ["beginner","intermediate","cat","gdpi"];
const EXAMS = ["CAT","XAT","NMAT","SNAP","IIFT","CMAT","MAT"];
const ADVANCED_WORD_POOL = `abnegation abrogate abscond abstruse accretion acerbic acquiesce adumbrate alacrity anachronistic anodyne antipathy apocryphal approbation arduous ascetic assiduous attenuate audacious austere axiomatic bellicose bombastic bowdlerize cacophony calumny capricious castigate chicanery circumspect cogent compunction conciliatory conflate connivance conspicuous contumacious copious deleterious demagogue demur descry desultory diatribe dichotomy diffident dilatory disabuse discordant disingenuous disinterested dogmatic ebullient eclectic effrontery egregious enervate enigmatic ephemeral equanimity equivocate eschew esoteric eulogy exacerbate excoriate exculpate exigent expostulate expunge fastidious fecund felicity fulminate garrulous hegemony iconoclast idiosyncrasy immutable impecunious imperious implacable inchoate incipient indefatigable indolent ineffable ineluctable ingenuous inimical innocuous insidious intransigent inveterate irascible jejune laconic lambaste lassitude limpid loquacious lugubrious magnanimous malapropism malleable maudlin mendacious mercurial meticulous misanthrope mitigant mollify moribund munificent nebulous nefarious obdurate obfuscate obsequious obstreperous officious ostentatious palliate parsimonious paucity pellucid perfidious perfunctory perspicacious pertinacious phlegmatic polemic portentous pragmatic prevaricate prodigious propitiate punctilious pusillanimous quixotic recalcitrant redolent refractory reify reticent sagacious sanguine sardonic scintillating sedulous sententious soporific specious spurious stolid stratagem stringent supercilious surreptitious sycophantic taciturn temerity tenacious torpor trenchant truculent ubiquitous umbrage vacillate vacuous venerable veracity verbose vicissitude vituperate vitriolic vociferous winnow zealous aberration abeyance abstemious accost acrimony acumen adamant admonish adulterate aesthetic affable aggrandize alchemy alienate altruism ambivalent ameliorate amenable amorphous anathema ancillary animus anomaly antediluvian antithesis aplomb apostate arbitrary arcane artifice asperity assuage atavistic august avarice banal bane benign bolster brazen bucolic burgeon burnish cajole candor canny censure chastise circumscribe clairvoyant clamor coalesce coercive complacent complaisant conflagration connoisseur contrite convivial convoluted corroborate credulous cryptic culpable debacle debauchery debunk decorum deference deft denigrate deride derivative didactic digress discerning discomfit disconcert disenfranchise disparate dispel docile duplicity edifying efface effusive elegy elicit embellish empirical emulate endemic ephemeral erudite ethereal euphony evanescent exacting exiguous expedient extirpate extraneous facetious facile fallacious fatuous fervent fetter flippant foible forbearance fortuitous frugal furtive gainsay genial germane grandiloquent gregarious guile hapless harangue heresy heterodox hyperbole ignominious illustrious impassive impecunious impetuous imperturbable impervious impugn inadvertent incisive incongruous indignant indolent inexorable infelicitous ingratiate insouciant intrepid irrefutable jaundiced juxtapose largesse latent lethargy levity lucid machination malfeasance malinger mawkish mendicant modicum mordant myriad nascent nettlesome obviate occlude onerous opprobrium oscillate overt pallid parochial pedantic penury perennial perfidy pernicious perspicuity petulant placate platitude plausible plebeian poignant polemical preclude predilection prescient probity proclivity profligate prolific promulgate prudent puerile pugnacious quandary querulous quiescent rancor rarefied rebuke redoubtable refute relegate remiss reprisal reproach repudiation resilient reverent rhetorical ruminate salubrious sanction scrupulous seminal solicitous somnolent splenetic sporadic stymie subjugate sublime subterfuge succinct supplant surfeit tantamount tedious timorous transitory ubiquitous unctuous untenable upbraid vacillate vainglorious venal venerate vestigial vilify virulent voluble whimsical`.split(/\s+/);

function estimateTokens(text: string): number {
  return Math.ceil(String(text || "").length / 4);
}

function estimateCostUsd(provider: Provider, inputTokens: number, outputTokens: number): number {
  if (provider === "openai") return (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.60;
  return (inputTokens + outputTokens) * 0.0000015;
}

function slugify(w: string): string {
  return String(w).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  const out: T[] = [];
  const used = new Set<number>();
  while (out.length < n) {
    const i = Math.floor(Math.random() * arr.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }
  return out;
}

function pickTargetWords(seen: Set<string>, need: number, attempt: number): string[] {
  const offset = attempt % Math.max(ADVANCED_WORD_POOL.length, 1);
  const rotated = ADVANCED_WORD_POOL.slice(offset).concat(ADVANCED_WORD_POOL.slice(0, offset));
  return rotated.filter((w) => !seen.has(slugify(w))).slice(0, need);
}

type Provider = "lovable" | "openai";

async function generateBatch(
  provider: Provider,
  keys: { lovable: string; openai: string },
  batchSize: number,
  category: string | null,
  difficulty: string | null,
  exam: string | null,
  exclude: string[],
  recentDupes: string[],
  targetWords: string[],
) {
  const catLine = category ? `Restrict every word to the category: ${category}.` : `Cover finance, marketing, consulting, HR, economics, corp_comm, general.`;
  // HARD MODE: force CAT/GDPI-tier difficulty by default. Easy tiers only when admin explicitly asks.
  const allowEasy = difficulty === "beginner" || difficulty === "intermediate";
  const diffLine = difficulty
    ? `Difficulty: ${difficulty}.`
    : `Difficulty: ONLY "cat" or "gdpi". NEVER beginner/intermediate. These must be HARD, exam-grade words an average graduate would NOT know.`;
  const examLine = exam
    ? `EXAM SCOPE: Only words actually appeared in real past ${exam} papers (verbal/RC/vocab/SC/cloze). Each MUST list at least one verifiable "${exam} <YEAR> Slot <N>" appearance. If unsure, OMIT.`
    : "";
  const sampled = sampleArray(exclude, 400);
  const dupeLine = recentDupes.length ? ` Avoid recent duplicates: ${recentDupes.slice(-100).join(", ")}.` : "";
  const targetLine = targetWords.length
    ? `TARGET WORDS: Prefer these exact unused hard words first, and fully enrich them: ${targetWords.join(", ")}. If any target is unsuitable, replace it with another word of the same advanced difficulty.`
    : "";
  const excludeBlock = exclude.length
    ? `UNIQUENESS: Library has ${exclude.length} words. DO NOT return any (case-insensitive) from: ${sampled.join(", ")}.${dupeLine}`
    : "";

  const examAppearanceRule = exam
    ? `- exam_appearances: REQUIRED non-empty. Each entry matches "${exam} <YEAR> Slot <N>" or "${exam} <YEAR>". Never fabricate.`
    : `- exam_appearances: real past Indian MBA exam appearances ("CAT 2019 Slot 2"). If unsure, return [].`;

  const hardnessBlock = allowEasy ? "" : `
DIFFICULTY BAR — STRICT. Every word MUST satisfy ALL of:
1. CAT/XAT/GRE-tier vocabulary an average Indian graduate would NOT immediately understand.
2. Minimum 7 letters, ideally Latinate / Greek-rooted, polysyllabic, or literary/idiomatic.
3. NOT in the common-English top ~10,000 list. NO everyday business jargon.

BANNED — do NOT return these or anything similarly basic (case-insensitive, including plurals/forms):
market, marketing, profit, revenue, budget, growth, leader, leadership, manager, management, customer, client, brand, branding, sales, price, pricing, cost, value, team, teamwork, goal, vision, mission, target, strategy, plan, planning, product, project, finance, money, bank, banking, loan, invest, investor, investment, asset, equity, debit, credit, debt, share, stock, trade, trader, trading, deal, offer, demand, supply, buyer, seller, retail, wholesale, loss, income, expense, tax, salary, wage, job, work, office, company, business, firm, industry, economy, economic, idea, success, failure, risk, reward, partner, partnership, merge, merger, owner, agent, agency, service, quality, hire, fire, boss, employee, staff, meeting, report, email, chart, graph, data, trend, save, spend, buy, sell, growth, scale, scaling, launch, pitch, deck, startup, founder, network, networking, brand, market, deal, leader, profit.

DIFFICULTY EXAMPLES (style only, not a reusable list): perspicacious, obfuscate, sycophantic, anachronistic, ostentatious, recalcitrant, ineluctable, propitiate, lugubrious, contumacious. If any example is already in the exclude list, never return it. Prefer fresh rare words from lexicon families like rhetoric, logic, literary criticism, psychology, economics, governance, ethics, and RC prose.

If a word does not clearly meet this bar, OMIT it and return another in its place.`;

  // Compact system prompt — saves ~500 input tokens per call vs the old verbose one.
  const system = `You curate ADVANCED MBA vocabulary for Indian aspirants (CAT/XAT/NMAT/SNAP/IIFT/CMAT/MAT, GDPI, placements). You ONLY return hard, exam-grade words — never basic business jargon.

EVERY word MUST include EVERY field, fully filled — no nulls, no placeholders:
- word, part_of_speech (noun/verb/adjective/adverb, lowercase)
- meaning: 1-2 sentence English definition (>=10 words)
- meaning_hindi: DEVANAGARI script (must contain Devanagari chars). Ex: "मूल्यह्रास — संपत्ति के मूल्य में क्रमिक कमी।"
- hinglish_meaning: easy Roman-script Hindi. Ex: "Matlab asset ki value time ke saath kam hona."
- pronunciation_syllables: hyphen-broken, STRESSED syllable in CAPS. Ex: "uh-MOR-tuh-zay-shun" (MUST contain a hyphen)
- pronunciation: same as syllables
- synonyms: 3-5 strings | antonyms: 2-5 strings (never empty)
- example_business, example_interview, example_email: one full sentence each
${examAppearanceRule}
- category: finance|marketing|consulting|hr|economics|corp_comm|general
- difficulty: beginner|intermediate|cat|gdpi
${hardnessBlock}
If you cannot fully complete ALL fields with high quality, OMIT the word. Unique within batch, not in exclude list.`;

  const user = `Generate exactly ${batchSize} unique fully-complete ${allowEasy ? "" : "HARD CAT/GDPI-tier "}words. ${catLine} ${diffLine} ${examLine} ${targetLine} ${excludeBlock}\n\nReturn ONLY via the emit_vocab_batch tool.`;
  const promptTokenEstimate = estimateTokens(system + user);

  const toolSchema = {
    type: "function",
    function: {
      name: "emit_vocab_batch",
      description: "Return a batch of structured MBA vocabulary words.",
      parameters: {
        type: "object",
        properties: {
          words: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                word: { type: "string" },
                part_of_speech: { type: "string" },
                meaning: { type: "string" },
                meaning_hindi: { type: "string" },
                hinglish_meaning: { type: "string" },
                pronunciation: { type: "string" },
                pronunciation_syllables: { type: "string" },
                synonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
                antonyms: { type: "array", items: { type: "string" }, maxItems: 5 },
                example_business: { type: "string" },
                example_interview: { type: "string" },
                example_email: { type: "string" },
                exam_appearances: { type: "array", items: { type: "string" }, maxItems: 6 },
                category: { type: "string", enum: CATEGORIES },
                difficulty: { type: "string", enum: DIFFICULTIES },
              },
              required: ["word","part_of_speech","meaning","meaning_hindi","hinglish_meaning","pronunciation_syllables","synonyms","antonyms","example_business","example_interview","example_email","exam_appearances","category","difficulty"],
              additionalProperties: false,
            },
          },
        },
        required: ["words"],
        additionalProperties: false,
      },
    },
  } as const;

  const endpoint = provider === "openai"
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const apiKey = provider === "openai" ? keys.openai : keys.lovable;
  const model = provider === "openai" ? "gpt-4o-mini" : "google/gemini-3-flash-preview";

  if (!apiKey) throw new Error(provider === "openai" ? "OPENAI_API_KEY not configured" : "LOVABLE_API_KEY not configured");

  const timeoutMs = provider === "openai" ? 55_000 : 50_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "emit_vocab_batch" } },
        max_tokens: provider === "openai" ? 6500 : 6000,
        ...(provider === "openai" ? { temperature: 0.55 } : {}),
      }),
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw new Error("AI_TIMEOUT");
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (resp.status === 429) throw new Error("RATE_LIMIT");
  if (resp.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (resp.status === 401) throw new Error(`${provider.toUpperCase()}_AUTH_FAILED`);
  if (!resp.ok) throw new Error(`${provider} ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("No tool call returned");
  const parsed = JSON.parse(args);
  return {
    words: Array.isArray(parsed.words) ? parsed.words : [],
    inputTokens: j.usage?.prompt_tokens || promptTokenEstimate,
    outputTokens: j.usage?.completion_tokens || estimateTokens(args),
  };
}

async function runJob(jobId: string, total: number, category: string | null, difficulty: string | null, exam: string | null, provider: Provider, seed?: { generated: number; duplicates: number; failed: number; attempts?: number; rejected?: number; estimated_input_tokens?: number; estimated_output_tokens?: number; estimated_cost_usd?: number }) {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const keys = {
    lovable: Deno.env.get("LOVABLE_API_KEY") || "",
    openai: Deno.env.get("OPENAI_API_KEY") || "",
  };

  let generated = seed?.generated || 0;
  let duplicates = seed?.duplicates || 0;
  let failed = seed?.failed || 0;
  let attempts = seed?.attempts || 0;
  let rejected = seed?.rejected || 0;
  let inputTokens = seed?.estimated_input_tokens || 0;
  let outputTokens = seed?.estimated_output_tokens || 0;
  let costUsd = Number(seed?.estimated_cost_usd || 0);
  const seenSlugs = new Set<string>();
  const recentDupes: string[] = [];


  // Seed exclude list with ALL existing slugs (paginated, so dedupe works for large libraries)
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: page } = await supabase.from("vocab_words").select("word").range(from, from + PAGE - 1);
      if (!page || page.length === 0) break;
      for (const r of page as any[]) if (r.word) seenSlugs.add(slugify(r.word));
      if (page.length < PAGE) break;
      from += PAGE;
    }
  }

  const originalStartedAt = new Date().toISOString();
  await supabase.from("vocab_generation_jobs").update({
    status: "running",
    provider,
    exam,
    batch_size: provider === "openai" ? 30 : 20,
    started_at: seed ? undefined : originalStartedAt,
    current_activity: seed ? `Resuming from ${generated}/${total} (${provider})…` : `Warming up (${provider})…`,
  }).eq("id", jobId);

  // OpenAI handles bigger batches reliably -> fewer calls -> lower cost.
  const BATCH = provider === "openai" ? 30 : 20;
  let consecutiveEmpty = 0;
  const MAX_ATTEMPTS = Math.ceil(total / BATCH) * 4 + 10; // safety cap
  // Soft wall-clock budget: exit cleanly before the edge runtime kills us.
  // Mark the job as `paused` so the UI can offer a Resume button.
  const startMs = Date.now();
  const MAX_RUN_MS = 4 * 60 * 1000; // 4 minutes per invocation

  while (generated < total && attempts < MAX_ATTEMPTS) {
    if (Date.now() - startMs > MAX_RUN_MS) {
      await supabase.from("vocab_generation_jobs").update({
        status: "paused",
        current_activity: `Paused at ${generated}/${total}. Click Resume to continue.`,
        generated, duplicates, failed, attempts, rejected,
        estimated_input_tokens: inputTokens,
        estimated_output_tokens: outputTokens,
        estimated_cost_usd: costUsd,
        progress_details: { cpu_proxy: 12, throughput_per_min: 0, last_batch_added: 0, last_batch_duplicates: 0, last_batch_rejected: 0, note: "Paused before runtime limit; resume continues safely." },
      }).eq("id", jobId);
      return;
    }

    attempts++;
    const need = Math.min(BATCH, total - generated);
    const targetWords = pickTargetWords(seenSlugs, need, attempts);
    await supabase.from("vocab_generation_jobs").update({
      current_activity: `Generating advanced CAT-level batch ${attempts} via ${provider} (${generated}/${total})…`,
      attempts,
      progress_details: { cpu_proxy: 68, target_words: targetWords.slice(0, 8), phase: "ai_generation" },
    }).eq("id", jobId);

    let batch: any[] = [];
    let batchTokens = { inputTokens: 0, outputTokens: 0 };
    const batchStarted = Date.now();
    try {
      const generatedBatch = await generateBatch(provider, keys, need, category, difficulty, exam, Array.from(seenSlugs), recentDupes, targetWords);
      batch = generatedBatch.words;
      batchTokens = { inputTokens: generatedBatch.inputTokens, outputTokens: generatedBatch.outputTokens };
      inputTokens += batchTokens.inputTokens;
      outputTokens += batchTokens.outputTokens;
      costUsd += estimateCostUsd(provider, batchTokens.inputTokens, batchTokens.outputTokens);
    } catch (e) {
      const msg = (e as Error).message;
      console.error("Batch error", msg);
      if (msg === "RATE_LIMIT") {
        await supabase.from("vocab_generation_jobs").update({ current_activity: "Rate limited, sleeping 15s…" }).eq("id", jobId);
        await new Promise((r) => setTimeout(r, 15000));
        continue;
      }
      if (msg === "CREDITS_EXHAUSTED") {
        await supabase.from("vocab_generation_jobs").update({ status: "failed", error: "AI credits exhausted." }).eq("id", jobId);
        return;
      }
      failed++;
      if (failed > 8) {
        await supabase.from("vocab_generation_jobs").update({ status: "failed", error: msg, failed }).eq("id", jobId);
        return;
      }
      continue;
    }

    if (!batch.length) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 3) break;
      continue;
    }
    consecutiveEmpty = 0;

    const rows: any[] = [];
    let rejectedIncomplete = 0;
    // Server-side hardness gate — reject basic words the model leaks through.
    const BANNED_BASIC = new Set([
      "market","markets","marketing","profit","profits","revenue","revenues","budget","budgets","growth","leader","leaders","leadership","manager","managers","management","customer","customers","client","clients","brand","brands","branding","sales","sale","price","prices","pricing","cost","costs","value","values","team","teams","teamwork","goal","goals","vision","mission","target","targets","strategy","strategies","plan","plans","planning","product","products","project","projects","finance","money","bank","banks","banking","loan","loans","invest","investor","investors","investment","investments","asset","assets","equity","debit","credit","credits","debt","debts","share","shares","stock","stocks","trade","trader","trading","deal","deals","offer","offers","demand","supply","buyer","seller","retail","wholesale","loss","losses","income","expense","expenses","tax","taxes","salary","salaries","wage","wages","job","jobs","work","office","offices","company","companies","business","businesses","firm","firms","industry","industries","economy","economic","idea","ideas","success","failure","risk","risks","reward","rewards","partner","partners","partnership","merge","merger","mergers","owner","owners","agent","agents","agency","agencies","service","services","quality","hire","fire","boss","employee","employees","staff","meeting","meetings","report","reports","email","emails","chart","charts","graph","graphs","data","trend","trends","save","spend","buy","sell","scale","scaling","launch","launches","pitch","deck","startup","startups","founder","founders","network","networking","support","help","share","work","skill","skills","task","tasks","role","roles","duty","duties","need","needs","want","wants","goal","plan","help",
    ]);
    const allowEasyServer = difficulty === "beginner" || difficulty === "intermediate";

    for (const w of batch) {
      if (!w?.word || !w?.meaning) { rejectedIncomplete++; continue; }
      const slug = slugify(w.word);
      if (!slug || seenSlugs.has(slug)) {
        duplicates++;
        recentDupes.push(w.word);
        if (recentDupes.length > 300) recentDupes.splice(0, recentDupes.length - 300);
        continue;
      }

      // Hardness gate
      if (!allowEasyServer) {
        const lw = String(w.word).trim().toLowerCase();
        if (BANNED_BASIC.has(lw) || lw.length < 7) { rejectedIncomplete++; continue; }
        // Reject if AI returned beginner/intermediate against our intent
        if (w.difficulty === "beginner" || w.difficulty === "intermediate") { rejectedIncomplete++; continue; }
      }


      // STRICT: every required field must be a non-empty string / non-empty array.
      const hasText = (v: any) => typeof v === "string" && v.trim().length > 1;
      const hasArr = (v: any) => Array.isArray(v) && v.filter((x) => typeof x === "string" && x.trim()).length > 0;
      const complete =
        hasText(w.meaning) &&
        hasText(w.meaning_hindi) &&
        /[\u0900-\u097F]/.test(w.meaning_hindi) && // must contain Devanagari
        hasText(w.hinglish_meaning) &&
        hasText(w.pronunciation_syllables) &&
        w.pronunciation_syllables.includes("-") && // must be hyphen-broken
        hasText(w.example_business) &&
        hasText(w.example_interview) &&
        hasText(w.example_email) &&
        hasArr(w.synonyms) &&
        hasArr(w.antonyms) &&
        hasText(w.part_of_speech) &&
        // When an exam is specified, require at least one valid exam appearance for that exam.
        (!exam || (hasArr(w.exam_appearances) && w.exam_appearances.some((s: any) =>
          typeof s === "string" && new RegExp(`\\b${exam}\\b`, "i").test(s) && /\b(19|20)\d{2}\b/.test(s)
        )));
      if (!complete) { rejectedIncomplete++; continue; }

      seenSlugs.add(slug);
      rows.push({
        word: w.word,
        slug,
        part_of_speech: w.part_of_speech,
        meaning: w.meaning,
        meaning_hindi: w.meaning_hindi,
        hinglish_meaning: w.hinglish_meaning,
        pronunciation: w.pronunciation || w.pronunciation_syllables,
        pronunciation_syllables: w.pronunciation_syllables,
        synonyms: w.synonyms,
        antonyms: w.antonyms,
        example_business: w.example_business,
        example_interview: w.example_interview,
        example_email: w.example_email,
        exam_appearances: Array.isArray(w.exam_appearances) ? w.exam_appearances : [],
        category: CATEGORIES.includes(w.category) ? w.category : (category || "general"),
        difficulty: DIFFICULTIES.includes(w.difficulty) ? w.difficulty : (difficulty || "intermediate"),
        source: "ai_bulk",
      });
    }
    if (rejectedIncomplete) {
      console.log(`Rejected ${rejectedIncomplete} incomplete words in batch ${attempts}`);
    }

    let addedNow = 0;
    if (rows.length) {
      const { data: inserted, error } = await supabase
        .from("vocab_words")
        .upsert(rows, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) {
        console.error("Upsert error", error);
        failed++;
      } else {
        addedNow = inserted?.length || 0;
        generated += addedNow;
        // any rows that didn't insert were duplicates from a race
        duplicates += rows.length - addedNow;
      }
    }
    rejected += rejectedIncomplete;
    const elapsedMinutes = Math.max(0.05, (Date.now() - startMs) / 60000);
    const batchSeconds = Math.max(1, Math.round((Date.now() - batchStarted) / 1000));
    const throughput = Math.round(generated / elapsedMinutes);
    const cpuProxy = Math.min(96, Math.max(18, Math.round(35 + (batchSeconds / 45) * 35 + (batch.length / Math.max(need, 1)) * 18)));

    await supabase.from("vocab_generation_jobs").update({
      generated, duplicates, failed, attempts, rejected,
      estimated_input_tokens: inputTokens,
      estimated_output_tokens: outputTokens,
      estimated_cost_usd: costUsd,
      progress_details: {
        phase: "dedupe_and_save",
        cpu_proxy: cpuProxy,
        throughput_per_min: throughput,
        last_batch_seconds: batchSeconds,
        last_batch_returned: batch.length,
        last_batch_candidates: rows.length,
        last_batch_added: addedNow,
        last_batch_duplicates: Math.max(0, rows.length - addedNow),
        last_batch_rejected: rejectedIncomplete,
        input_tokens_last_batch: batchTokens.inputTokens,
        output_tokens_last_batch: batchTokens.outputTokens,
        target_words: targetWords.slice(0, 8),
      },
    }).eq("id", jobId);
  }

  const finalStatus = generated >= total ? "completed" : "paused";
  await supabase.from("vocab_generation_jobs").update({
    status: finalStatus,
    current_activity: generated >= total
      ? `Done. Added ${generated}, skipped ${duplicates} duplicates, ${failed} failed batches.`
      : `Paused at ${generated}/${total}. Need more unique advanced words; click Resume to continue with a fresh target list.`,
    generated, duplicates, failed, attempts, rejected,
    estimated_input_tokens: inputTokens,
    estimated_output_tokens: outputTokens,
    estimated_cost_usd: costUsd,
    finished_at: finalStatus === "completed" ? new Date().toISOString() : null,
    progress_details: { phase: finalStatus, cpu_proxy: finalStatus === "completed" ? 0 : 10, throughput_per_min: 0 },
  }).eq("id", jobId);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // Direct lookup with service role — has_role() RPC is restricted to auth.uid() context.
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Not authorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (req.method === "GET") {
      const url = new URL(req.url);
      const jobId = url.searchParams.get("job_id");
      if (!jobId) return new Response(JSON.stringify({ error: "job_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data, error } = await supabase.from("vocab_generation_jobs").select("*").eq("id", jobId).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ job: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));

    // ---- RESUME path ----
    if (body.resume_job_id) {
      const { data: existing, error: jErr } = await supabase
        .from("vocab_generation_jobs").select("*").eq("id", body.resume_job_id).maybeSingle();
      if (jErr || !existing) return new Response(JSON.stringify({ error: "Job not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (existing.status === "completed") return new Response(JSON.stringify({ job_id: existing.id, status: "completed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const resumeProvider: Provider = body.provider === "openai" ? "openai" : (body.provider === "lovable" ? "lovable" : "lovable");
      const resumeExam = body.exam && EXAMS.includes(String(body.exam).toUpperCase()) ? String(body.exam).toUpperCase() : null;
      await supabase.from("vocab_generation_jobs").update({ status: "running", error: null, current_activity: "Resuming…" }).eq("id", existing.id);
      // @ts-ignore Edge runtime background tasks
      EdgeRuntime.waitUntil(runJob(existing.id, existing.requested, existing.category, existing.difficulty, resumeExam || existing.exam || null, resumeProvider, {
        generated: existing.generated || 0,
        duplicates: existing.duplicates || 0,
        failed: existing.failed || 0,
        attempts: existing.attempts || 0,
        rejected: existing.rejected || 0,
        estimated_input_tokens: existing.estimated_input_tokens || 0,
        estimated_output_tokens: existing.estimated_output_tokens || 0,
        estimated_cost_usd: existing.estimated_cost_usd || 0,
      }));
      return new Response(JSON.stringify({ job_id: existing.id, resumed: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let count = Number(body.count || 100);
    if (!Number.isFinite(count) || count < 1) count = 100;
    count = Math.min(count, 5000);
    const category = body.category && CATEGORIES.includes(body.category) ? body.category : null;
    const difficulty = body.difficulty && DIFFICULTIES.includes(body.difficulty) ? body.difficulty : null;
    const exam = body.exam && EXAMS.includes(String(body.exam).toUpperCase()) ? String(body.exam).toUpperCase() : null;
    const provider: Provider = body.provider === "openai" ? "openai" : "lovable";

    if (provider === "openai" && !Deno.env.get("OPENAI_API_KEY")) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured in backend secrets." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: job, error } = await supabase.from("vocab_generation_jobs").insert({
      requested: count, category, difficulty, provider, exam, status: "pending",
      created_by: user.id,
      current_activity: `Queued (${provider}${exam ? `, ${exam}-only` : ""})`,
    }).select().single();
    if (error) throw error;

    // @ts-ignore Edge runtime background tasks
    EdgeRuntime.waitUntil(runJob(job.id, count, category, difficulty, exam, provider));

    return new Response(JSON.stringify({ job_id: job.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("vocab-bulk-generate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
