import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const listAssessments = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("assessments")
    .select("slug, title, description")
    .order("sort_order", { ascending: true, nullsFirst: false });
  return { assessments: data ?? [] };
});

export const loadQuestions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slugs: z.array(z.string()).min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: asmts } = await supabaseAdmin
      .from("assessments")
      .select("id, slug, title, questions(id, text, sort_order, question_options(id, label, sort_order))")
      .in("slug", data.slugs);
    const modules = (asmts ?? []).map((a) => ({
      slug: a.slug,
      title: a.title,
      questions: (a.questions ?? [])
        .sort((x: { sort_order: number }, y: { sort_order: number }) => x.sort_order - y.sort_order)
        .map((q: { id: string; text: string; question_options: Array<{ id: string; label: string; sort_order: number }> }) => ({
          id: q.id,
          text: q.text,
          options: q.question_options.sort((x, y) => x.sort_order - y.sort_order).map((o) => ({ id: o.id, label: o.label })),
        })),
    }));
    return { modules };
  });

export type DashboardResult = {
  summary: { headline: string; bullets: string[]; motivation?: string };
  roleModels: Array<{ name: string; why: string; photoUrl?: string }>;
  roadmap: Array<{ horizon: string; action: string }>;
  opportunities: Array<{ title: string; org: string; stipend: string; confidence: string; url?: string }>;
  podcasts: Array<{ title: string; host: string; pitch: string; url?: string; thumbnailUrl?: string }>;
  analysis?: {
    personality: string;
    strengths: string[];
    growthAreas: string[];
    interests: string[];
    motivations: string;
    learningStyle: string;
    blindSpots: string[];
    careerInsights: string;
    conclusion: string;
  };
  perspective?: {
    headline: string;
    stat: string;
    statNumber: string;
    source?: string;
    message: string;
    simpleMeaning: string;
    lessPrivileged: { number: string; label: string; message: string };
    facts: Array<{ number: string; label: string; detail: string }>;
    belowYou?: Array<{ number: string; label: string; detail: string; category: "uneducated" | "unemployed" | "unskilled" }>;
  };
};

const AnalyzeSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(8).max(99),
  education: z.string().optional(),
  skills: z.array(z.string()).optional(),
  customSkill: z.string().optional(),
  goal: z.string().optional(),
  oneLiner: z.string().optional(),
  slugs: z.array(z.string()).min(1),
  answers: z.array(z.object({
    moduleSlug: z.string(),
    question: z.string(),
    answer: z.string().optional(),
    custom: z.string().optional(),
    skipped: z.boolean().optional(),
  })),
});

const SYSTEM_PROMPT = `You are MyFlow, a warm, sharp coach for young people (ages 11–27). You synthesize a person's assessment answers into a personalized 5-panel dashboard.

CRITICAL: Return ONLY valid JSON (no markdown, no code fences) matching exactly this shape:
{
  "summary": { "headline": string, "bullets": string[3], "motivation": string },
  "roleModels": [ { "name": string, "why": string } ] (exactly 3),
  "roadmap": [ { "horizon": "30 days"|"3 months"|"6 months"|"1 year", "action": string } ] (exactly 4, in that order),
  "opportunities": [ { "title": string, "org": string, "stipend": string, "confidence": "High"|"Medium"|"Low", "url": string } ] (exactly 3),
  "podcasts": [ { "title": string, "host": string, "pitch": string, "url": string, "thumbnailUrl": string } ] (exactly 3),
  "analysis": {
    "personality": string (2-3 sentences describing personality patterns),
    "strengths": string[] (3-5 concrete strengths grounded in the answers),
    "growthAreas": string[] (2-4 honest, kind growth areas),
    "interests": string[] (3-5 inferred interests / passion signals),
    "motivations": string (what drives them, 1-2 sentences),
    "learningStyle": string (how they seem to learn best, 1-2 sentences),
    "blindSpots": string[] (1-3 potential blind spots, framed as awareness not criticism),
    "careerInsights": string (2-3 sentences on fitting directions given their age, goal, skills),
    "conclusion": string (warm closing paragraph, 3-4 sentences, addressed by name)
  },
  "perspective": {
    "headline": string,
    "stat": string,
    "statNumber": string,
    "source": string,
    "message": string,
    "simpleMeaning": string,
    "lessPrivileged": { "number": string, "label": string, "message": string },
    "facts": [ { "number": string, "label": string, "detail": string } ] (exactly 3),
    "belowYou": [ { "number": string, "label": string, "detail": string, "category": "uneducated"|"unemployed"|"unskilled" } ] (exactly 3, one per category, in that order)
  }
}
Ground every field in the user's ACTUAL answers, goal, self-description, custom skills, and any free-text "Other" responses. When a question is marked SKIPPED, treat it as a signal (they weren't sure or it didn't apply) — never fabricate an answer for it. Adapt intelligently to whatever they DID share, however sparse. No generic filler. No disclaimers.

Rules:
- summary: return exactly 3 bullets, each one paragraph (3-5 sentences), in this order and ALL POSITIVE/CONSTRUCTIVE in tone:
  1. Existing capabilities — celebrate what the user already brings to the table (skills, mindset, patterns from their answers). Warm, specific, addressed to them by name at least once.
  2. Improvements needed — framed as opportunities and next-level growth, never as flaws. Say "you could sharpen…", "adding X will amplify…". Keep it kind, actionable, forward-looking.
  3. Motivation — a rousing, personal pep talk addressed to them by name. End on an uplifting sentence.
  Keep summary.headline short (max 12 words) and hopeful. summary.motivation stays 1–2 warm sentences.
- roleModels: MUST be INDIA-BASED, GENUINE, and PUBLICLY VERIFIABLE (real people with Wikipedia pages / mainstream press coverage — no fictional or unverifiable names). Tailor to the user's EXACT age band and goal — do NOT reuse the same 3 people for every user, and prefer role models whose OWN breakthrough age is close to (or realistically reachable from) the user's age.
  • Age 10-14: Indian teen prodigies and youth changemakers whose achievements happened AS teens (e.g. Licypriya Kangujam, Tilak Mehta, Advait Kolarkar, Suhani Bhatnagar).
  • Age 15-18: high-school-era Indian breakouts and young athletes/creators (e.g. R Praggnanandhaa, D Gukesh, Divyansh Singh Panwar, Anahat Singh) matched to their skills.
  • Age 19-22: emerging Indian entrepreneurs, athletes, creators whose breakthrough came in college years (e.g. Neeraj Chopra, PV Sindhu, Ritesh Agarwal, Prajakta Koli).
  • Age 23-27: early-career Indian founders and professionals (e.g. Kunal Shah, Nithin Kamath, Aman Gupta, Falguni Nayar, Byju Raveendran, Bhavish Aggarwal) whose trajectory maps to the user's goal.
  Vary by skills — a coder gets different names than a writer, athlete, or designer. Never invent a person; if unsure, pick a widely-known Indian figure whose name is easy to Google-verify.
- podcasts.url: a real, direct https link (Spotify, Apple Podcasts, YouTube, or the show's official site). Never invent a broken URL — if unsure, link to the show's Spotify or Apple Podcasts search page.
- opportunities: MUST be INDIA-BASED and matched to the user's education stage AND declared skills. Stipends in INR (₹). For school students: Indian scholarships, olympiads, and youth programs (KVPY successor INSPIRE, NTSE, Atal Tinkering Labs, Kishore Vaigyanik Protsahan Yojana, Pratham, Ashoka Youth Venture). For college students: Indian internships and fellowships (Internshala, LinkedIn India, SIP programs at TCS/Infosys/Flipkart/Zomato, IIT/IIM summer schools, Young India Fellowship, Teach For India, Gandhi Fellowship). For graduated / job-hunting: Indian entry-level roles, apprenticeships and paid fellowships (NASSCOM FutureSkills, Naukri, LinkedIn India Jobs, Chief of Staff programs at Indian startups). For working users: next-step Indian roles or upskilling (upGrad, Scaler, Newton School, GreatLearning). opportunities.url MUST be a real https link on an Indian site or a global site's India page (internshala.com, unstop.com, naukri.com, linkedin.com/jobs India, buddy4study.com, vidyalakshmi.co.in, official program pages). Stipend format: use "₹" with an INR range (e.g. "₹15,000–25,000/month" or "Unpaid" or "₹2 LPA"). Never invent a broken URL — if unsure, link to a search page on the Indian site.
- perspective: a motivating "put things in context" panel.
  • MUST be INDIA-SPECIFIC — every number, label, and source must refer to India (Indian children, Indian youth, Indian workforce), NOT global/world figures.
  • statNumber is a big bold figure about India (e.g. "32 million", "1.5 crore", "12 million"). Prefer plain-language units (million/billion) over abbreviations.
  • stat is a one-line framing of that number specific to India (e.g. "children in India are out of school").
  • source cites a credible India-focused source (UDISE+, NSSO, NITI Aayog, MoSPI, ASER, Ministry of Education India, PLFS, UNICEF India, World Bank India, ILO India).
  • simpleMeaning: 1–2 SHORT sentences a 10-year-old can understand, always about Indian youth. End with a why-it-matters-to-YOU line addressed to the user by name.
  • message: 2 warm sentences that turn the Indian stat into gratitude + fuel for the user by name — not pity.
  • lessPrivileged: a concrete count of YOUNG PEOPLE IN INDIA with FEWER opportunities than the user (Indian schooling, internet access in India, safety, food, healthcare — pick the axis that fits their answers). number is a big India-only figure (e.g. "32 million", "1.5 crore"), label is a short tag naming Indian kids/youth (e.g. "kids in India out of school right now"), message is 1–2 kid-friendly sentences addressed to the user by name framing it as motivation.
  • facts are 3 additional grounding stats about India (number + short label + one-line detail), each from a real India-focused source above.
  Prefer recent figures (last 5 years). Never fabricate — if unsure, use a widely-cited Indian figure. Do NOT use global/worldwide numbers anywhere in perspective.`;

export const analyzeGuest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const userMsg = [
      `Name: ${data.name}`,
      `Age: ${data.age}`,
      data.education ? `Current stage: ${data.education}` : `Current stage: (not provided)`,
      `Existing skills: ${(data.skills && data.skills.length) ? data.skills.join(", ") : "(none declared)"}`,
      data.customSkill ? `Custom skills (typed): ${data.customSkill}` : `Custom skills: (none)`,
      data.goal ? `Current goal (user's words): ${data.goal}` : `Current goal: (not shared)`,
      data.oneLiner ? `Self-description (one line): "${data.oneLiner}"` : `Self-description: (not shared)`,
      `Modules explored: ${data.slugs.join(", ")}`,
      ``,
      `Answers:`,
      ...data.answers.map((a, i) => {
        if (a.skipped) return `${i + 1}. [${a.moduleSlug}] Q: ${a.question}\n   A: (SKIPPED)`;
        const ans = a.custom ? `${a.answer ?? "Other"} — "${a.custom}"` : (a.answer ?? "");
        return `${i + 1}. [${a.moduleSlug}] Q: ${a.question}\n   A: ${ans}`;
      }),
    ].join("\n");
    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: SYSTEM_PROMPT,
      prompt: userMsg,
    });
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as DashboardResult;
      // Enrich role models with Wikipedia thumbnails; fallback to generated avatars.
      const enriched = await Promise.all(
        (parsed.roleModels ?? []).map(async (rm) => {
          const photoUrl = await fetchWikiThumb(rm.name) ?? avatarFor(rm.name);
          return { ...rm, photoUrl };
        })
      );
      parsed.roleModels = enriched;
      // Validation: enforce India-specific perspective content.
      if (parsed.perspective) {
        parsed.perspective = sanitizePerspective(parsed.perspective);
      }
      return { result: parsed };
    } catch {
      throw new Error("AI returned an invalid response. Please try again.");
    }
  });

// ---- Perspective validation: India-only guardrail ----
const GLOBAL_TERMS = [
  "worldwide", "world wide", "global", "globally", "across the world",
  "around the world", "the world", "world's", "world population",
  "internationally", "international", "planet", "earth",
];
const INDIA_TERMS = [
  "india", "indian", "bharat", "udise", "nsso", "niti aayog", "aser",
  "unicef india", "world bank india", "ilo india", "mospi", "plfs",
  "ministry of education india", "government of india", "crore", "lakh", "₹",
];

function hasGlobal(text: string): boolean {
  const t = text.toLowerCase();
  return GLOBAL_TERMS.some((g) => new RegExp(`\\b${g}\\b`, "i").test(t));
}
function hasIndia(text: string): boolean {
  const t = text.toLowerCase();
  return INDIA_TERMS.some((g) => t.includes(g));
}
function scrubGlobal(text: string): string {
  let out = text;
  for (const g of GLOBAL_TERMS) {
    out = out.replace(new RegExp(`\\b${g}\\b`, "gi"), "in India");
  }
  // Collapse duplicates like "in India in India"
  out = out.replace(/(in India)(\s+in India)+/gi, "in India");
  return out;
}
function ensureIndia(text: string, fallbackSuffix = " (India)"): string {
  const cleaned = scrubGlobal(text);
  return hasIndia(cleaned) ? cleaned : `${cleaned.replace(/\s+$/, "")}${fallbackSuffix}`;
}

type Perspective = NonNullable<DashboardResult["perspective"]>;
function sanitizePerspective(p: Perspective): Perspective {
  const cleanedFacts = (p.facts ?? []).map((f) => ({
    number: f.number,
    label: ensureIndia(f.label ?? "", " in India"),
    detail: ensureIndia(f.detail ?? ""),
  }));
  const lp = p.lessPrivileged ?? { number: "", label: "", message: "" };
  const source = p.source ? scrubGlobal(p.source) : p.source;
  const validSource = source && hasIndia(source) ? source : "Ministry of Education India / UDISE+";
  return {
    headline: ensureIndia(p.headline ?? ""),
    stat: ensureIndia(p.stat ?? "", " in India"),
    statNumber: p.statNumber,
    source: validSource,
    message: scrubGlobal(p.message ?? ""),
    simpleMeaning: scrubGlobal(p.simpleMeaning ?? ""),
    lessPrivileged: {
      number: lp.number,
      label: ensureIndia(lp.label ?? "", " in India"),
      message: scrubGlobal(lp.message ?? ""),
    },
    facts: cleanedFacts,
  };
}

async function fetchWikiThumb(name: string): Promise<string | undefined> {
  try {
    const slug = encodeURIComponent(name.trim().replace(/\s+/g, "_"));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { "accept": "application/json", "user-agent": "MyFlow/1.0" },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as { thumbnail?: { source?: string }; originalimage?: { source?: string } };
    return j.thumbnail?.source ?? j.originalimage?.source;
  } catch {
    return undefined;
  }
}

function avatarFor(name: string): string {
  const n = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${n}&background=e0e7ff&color=1e3a8a&size=256&bold=true`;
}