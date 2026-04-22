// AI College Section Writer — generates structured content for one section of a college profile.
// Uses Lovable AI Gateway (openai/gpt-5) with tool-calling for type-safe structured output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SectionBrief {
  collegeName: string;
  city?: string | null;
  state?: string | null;
  type?: string | null;
  tier?: string | null;
  established?: number | null;
  sectionType: string; // matches SECTION_TYPES.value in AdminCollegeSections.tsx
  extraContext?: string;
}

const SECTION_TOOLS: Record<string, any> = {
  courses_fees: {
    name: "courses_fees_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "Short HTML intro paragraph (60-100 words)." },
      courses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            duration: { type: "string" },
            eligibility: { type: "string" },
            fees: { type: "string" },
            specializations: { type: "string" },
          },
          required: ["name", "duration", "eligibility", "fees", "specializations"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "courses"],
    instructions:
      "List 3-6 real flagship MBA / PGDM / Executive programs with REAL durations, eligibility (CAT/XAT etc.), latest 2025-2026 fee figures, and 3-5 specializations each.",
  },
  admission: {
    name: "admission_payload",
    fields: {
      title: { type: "string" },
      content: {
        type: "string",
        description:
          "HTML overview (180-280 words). Declarative, not question-based. Mentions latest 2025-2026 admission cycle.",
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, description: { type: "string" } },
          required: ["title", "description"],
          additionalProperties: false,
        },
      },
      eligibility: {
        type: "array",
        items: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "steps", "eligibility"],
    instructions: "5-7 sequential admission steps + 4-6 eligibility criteria. Real exams, real cutoffs.",
  },
  placements: {
    name: "placements_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 80-150 words narrative on latest 2024-2025 placement cycle." },
      avg_package: { type: "string", description: "e.g. INR 25 LPA" },
      highest_package: { type: "string" },
      median_package: { type: "string" },
      placement_rate: { type: "string", description: "e.g. 98%" },
      sectors: {
        type: "array",
        items: {
          type: "object",
          properties: { sector: { type: "string" }, percentage: { type: "string" } },
          required: ["sector", "percentage"],
          additionalProperties: false,
        },
      },
      recruiters: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "title", "content", "avg_package", "highest_package", "median_package",
      "placement_rate", "sectors", "recruiters",
    ],
    instructions:
      "Use latest 2024-2025 placement report figures. 5-7 sectors with realistic % shares (sum ~100). 10-15 real recruiters.",
  },
  cutoff: {
    name: "cutoff_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 80-150 words explaining cutoff trends for 2025-2026 cycle." },
      cutoffs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            percentile: { type: "string" },
            exam: { type: "string" },
            year: { type: "string" },
          },
          required: ["category", "percentile", "exam", "year"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "cutoffs"],
    instructions: "Cover General/OBC/SC/ST/EWS for the main exam(s) accepted. Use latest 2025 cycle cutoffs.",
  },
  rankings: {
    name: "rankings_payload",
    fields: {
      title: { type: "string" },
      rankings: {
        type: "array",
        items: {
          type: "object",
          properties: { body: { type: "string" }, rank: { type: "string" }, year: { type: "string" } },
          required: ["body", "rank", "year"],
          additionalProperties: false,
        },
      },
      accreditations: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "rankings", "accreditations"],
    instructions:
      "3-6 ranking bodies (NIRF, Outlook, Business Today, The Week, QS, FT) with latest 2025 ranks. Real accreditations only (AACSB/AMBA/EQUIS/NBA/NAAC).",
  },
  reviews: {
    name: "reviews_payload",
    fields: {
      title: { type: "string" },
      overall_rating: { type: "string", description: "e.g. 4.3" },
      aspects: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, score: { type: "string" } },
          required: ["label", "score"],
          additionalProperties: false,
        },
      },
      reviews: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            year: { type: "string" },
            rating: { type: "string" },
            positives: { type: "string" },
            negatives: { type: "string" },
          },
          required: ["name", "year", "rating", "positives", "negatives"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "overall_rating", "aspects", "reviews"],
    instructions:
      "5 rating aspects (Academics, Faculty, Infrastructure, Placements, Campus Life). 3-5 realistic anonymised student reviews from 2023-2025 batches.",
  },
  scholarships: {
    name: "scholarships_payload",
    fields: {
      title: { type: "string" },
      scholarships: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            criteria: { type: "string" },
            amount: { type: "string" },
            description: { type: "string" },
          },
          required: ["name", "criteria", "amount", "description"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "scholarships"],
    instructions: "3-6 realistic scholarships (merit, need-based, diversity, corporate-sponsored).",
  },
  faculty: {
    name: "faculty_payload",
    fields: {
      title: { type: "string" },
      faculty: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            department: { type: "string" },
            qualification: { type: "string" },
            experience: { type: "string" },
            photo_url: { type: "string" },
          },
          required: ["name", "department", "qualification", "experience", "photo_url"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "faculty"],
    instructions:
      "5-8 plausible faculty profiles. Leave photo_url as empty string ''. Use realistic Indian academic credentials (PhD IIM/IIT/foreign B-school).",
  },
  hostel: {
    name: "hostel_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 100-180 words on campus + hostel life." },
      campus_size: { type: "string" },
      total_students: { type: "string" },
      hostel_rooms: { type: "string" },
      library: { type: "string" },
      facilities: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "campus_size", "total_students", "hostel_rooms", "library", "facilities"],
    instructions: "8-14 real campus facilities. Realistic numbers based on the actual college.",
  },
  qa: {
    name: "qa_payload",
    fields: {
      title: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: { question: { type: "string" }, answer: { type: "string" } },
          required: ["question", "answer"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "questions"],
    instructions:
      "6-10 high-intent FAQs (fees, eligibility, cutoff, placements, hostel, scholarships, ranking, application deadline 2025-2026). Answers 40-80 words each, declarative, factually correct.",
  },
  why_join: {
    name: "why_join_payload",
    fields: {
      title: { type: "string" },
      content: { type: "string", description: "HTML 150-250 words explaining the USPs." },
      ratings: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, score: { type: "string" } },
          required: ["label", "score"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "content", "ratings"],
    instructions: "5 rating aspects (out of 5) + clear 'why join' narrative. No question headings.",
  },
  quick_info: {
    name: "quick_info_payload",
    fields: {
      title: { type: "string" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: { label: { type: "string" }, value: { type: "string" } },
          required: ["label", "value"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "items"],
    instructions:
      "8-12 quick-info rows: Location, Established, Type, NIRF Rank, Total Fees, Avg Package, Highest Package, Exams Accepted, Accreditation, Application Deadline (2025-2026), Programs Offered, Website.",
  },
  news: {
    name: "news_payload",
    fields: {
      title: { type: "string" },
      links: {
        type: "array",
        items: {
          type: "object",
          properties: { title: { type: "string" }, url: { type: "string" }, date: { type: "string" } },
          required: ["title", "url", "date"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "links"],
    instructions:
      "5-8 plausible recent news headlines from 2025 (admissions opening, placement results, ranking updates). Use relative URLs like /article/<slug>.",
  },
  gallery: {
    name: "gallery_payload",
    fields: {
      title: { type: "string" },
      images: {
        type: "array",
        items: {
          type: "object",
          properties: { url: { type: "string" }, caption: { type: "string" } },
          required: ["url", "caption"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "images"],
    instructions:
      "Return 6 image placeholders with empty url '' and meaningful captions (Main Building, Library, Auditorium, Hostel, Sports Complex, Convocation). The user will upload images themselves.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const brief = (await req.json()) as SectionBrief;
    if (!brief?.collegeName || !brief?.sectionType) {
      return new Response(
        JSON.stringify({ error: "collegeName and sectionType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const spec = SECTION_TOOLS[brief.sectionType];
    if (!spec) {
      return new Response(
        JSON.stringify({ error: `Unsupported sectionType: ${brief.sectionType}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a senior MBA/B-school researcher and SEO writer for Indian students. Write like a smart senior mentor — clear, friendly, plain English, contractions OK. NEVER fabricate facts about well-known institutions (IIMs, XLRI, FMS, MDI, SPJIMR, IIFT, NMIMS, SIBM, JBIMS, ISB, etc.).

ACCURACY RULES:
- Established years for famous schools must be correct (XLRI=1949, IIM-A=1961, IIM-B=1973, IIM-C=1961, FMS=1954, JBIMS=1965, SPJIMR=1981, MDI=1973, IIFT=1963, NMIMS=1981, ISB=2001).
- All fees, placements, cutoffs, recruiter lists must reflect the latest 2024-2025 placement cycle and 2025-2026 admission cycle. Never use 2020-2023 numbers.
- HTML output uses ONLY: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <a>, <table>, <thead>, <tbody>, <tr>, <th>, <td>. No <html>/<head>/<body>/<h1>/markdown fences.
- Headings & opening sentences must be DECLARATIVE — never start with a question.
- Avoid AI clichés: "delve into", "navigate the landscape", "in the realm of", "unlock your potential", "embark on a journey", "ever-evolving".
- Reading level ~grade 8. Use real numbers, real names, contractions.`;

    const userPrompt = `Generate the "${brief.sectionType}" section for the following Indian B-school. Verify every factual claim before writing.

# COLLEGE
- Name: ${brief.collegeName}
- City: ${brief.city || "(use the actual city)"}
- State: ${brief.state || "(use the actual state)"}
- Type: ${brief.type || "(use the correct type)"}
- Tier: ${brief.tier || "(use realistic tier)"}
- Established: ${brief.established ?? "(use the correct historical year)"}
${brief.extraContext ? `- Extra context: ${brief.extraContext}` : ""}

# SECTION INSTRUCTIONS
${spec.instructions}

# SEO MUST-HAVES
- Use the college name and primary keyword naturally (no stuffing).
- Latest 2025-2026 data context.
- Include 1-2 internal-link-style anchors where natural (e.g. <a href="/exams/cat">CAT exam</a>, <a href="/college-shortlister">College Shortlister</a>) — only inside HTML content fields.
- All headings declarative, no questions in headings.

Return JSON via the tool call below — fill EVERY required field with real, accurate values.`;

    const tool = {
      type: "function",
      function: {
        name: spec.name,
        description: `Return structured content for the ${brief.sectionType} section.`,
        parameters: {
          type: "object",
          properties: spec.fields,
          required: spec.required,
          additionalProperties: false,
        },
      },
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: spec.name } },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed", detail: txt.slice(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    const message = aiJson?.choices?.[0]?.message;
    const rawArgs = message?.tool_calls?.[0]?.function?.arguments;

    if (!rawArgs) {
      console.error("No tool call. Message preview:", JSON.stringify(message)?.slice(0, 800));
      return new Response(
        JSON.stringify({
          error: "AI did not return a structured section payload",
          detail: message?.content?.slice(0, 300) || "no content returned",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(rawArgs);
    } catch (e) {
      console.error("Parse fail:", String(e));
      return new Response(
        JSON.stringify({ error: "AI output was malformed JSON. Try again.", detail: String(e).slice(0, 200) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map structured payload back into the form shape used by AdminCollegeSections
    const { title, content, ...dataRest } = payload;
    return new Response(
      JSON.stringify({
        success: true,
        section: {
          title: title || null,
          content: typeof content === "string" ? content : "",
          data: dataRest,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-college-section error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
