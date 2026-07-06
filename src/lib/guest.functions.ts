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
  podcasts: Array<{ title: string; host: string; pitch: string; url?: string }>;
  perspective?: {
    headline: string;
    stat: string;
    statNumber: string;
    source?: string;
    message: string;
    simpleMeaning: string;
    lessPrivileged: { number: string; label: string; message: string };
    facts: Array<{ number: string; label: string; detail: string }>;
  };
};

const AnalyzeSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(8).max(99),
  education: z.string().optional(),
  skills: z.array(z.string()).optional(),
  slugs: z.array(z.string()).min(1),
  answers: z.array(z.object({ moduleSlug: z.string(), question: z.string(), answer: z.string() })),
});

const SYSTEM_PROMPT = `You are MyFlow, a warm, sharp coach for young people (ages 11–27). You synthesize a person's assessment answers into a personalized 5-panel dashboard.

CRITICAL: Return ONLY valid JSON (no markdown, no code fences) matching exactly this shape:
{
  "summary": { "headline": string, "bullets": string[3], "motivation": string },
  "roleModels": [ { "name": string, "why": string } ] (exactly 3),
  "roadmap": [ { "horizon": "30 days"|"3 months"|"6 months"|"1 year", "action": string } ] (exactly 4, in that order),
  "opportunities": [ { "title": string, "org": string, "stipend": string, "confidence": "High"|"Medium"|"Low", "url": string } ] (exactly 3),
  "podcasts": [ { "title": string, "host": string, "pitch": string, "url": string } ] (exactly 3),
  "perspective": {
    "headline": string,
    "stat": string,
    "statNumber": string,
    "source": string,
    "message": string,
    "simpleMeaning": string,
    "lessPrivileged": { "number": string, "label": string, "message": string },
    "facts": [ { "number": string, "label": string, "detail": string } ] (exactly 3)
  }
}
Ground every field in the user's answers. No generic filler. No disclaimers.

Rules:
- summary.motivation: 1–2 warm, personal sentences of encouragement addressed to the user by name.
- roleModels: pick people whose age, era, or breakout moment is RELATABLE to the user's age (e.g. teen prodigies for age 13, early-career founders for 22). Prefer contemporary figures the user could realistically look up today.
- podcasts.url: a real, direct https link (Spotify, Apple Podcasts, YouTube, or the show's official site). Never invent a broken URL — if unsure, link to the show's Spotify or Apple Podcasts search page.
- opportunities: MUST be matched to the user's education stage AND declared skills. If the user is in school, suggest scholarships, competitions, or teen fellowships. If in college, suggest internships and campus programs. If graduated / job-hunting, suggest entry-level jobs, apprenticeships, or paid fellowships they can apply to today. If already working, suggest next-step roles or upskilling programs. Even when the user only explored a couple of modules (e.g. Ability + Habits), lean on their skills list to still recommend concrete jobs / gigs / programs — never say "not enough info". opportunities.url must be a real https link (official program page, org site, or a reliable listing like Internshala / YourStory / opportunitydesk.org / LinkedIn Jobs search). Never invent a broken URL — if unsure, link to a search page on the org's site.
- perspective: a motivating "put things in context" panel.
  • statNumber is a big bold figure (e.g. "1.1B", "258M", "70%").
  • stat is a one-line framing of that number (e.g. "children worldwide are out of school").
  • source cites a credible org (UNICEF, WHO, UNESCO, World Bank, UN, ILO, WEF).
  • simpleMeaning: 1–2 SHORT sentences that a 10-year-old can understand. No jargon. Break the stat down like a friendly teacher — e.g. for "50% will need reskilling by 2025" say "That means 1 out of every 2 workers on Earth has to learn brand-new skills to keep their jobs. It's a huge wave — and you're already ahead by exploring who you are today." Always end this field with a why-it-matters-to-YOU line addressed to the user by name.
  • message: 2 warm sentences that turn the stat into gratitude + fuel for the user by name — not pity.
  • lessPrivileged: a concrete count of young people with FEWER opportunities than the user (schooling, internet, safety, food, healthcare — pick the axis that fits their answers). number is a big figure (e.g. "244M", "1.3B"), label is a short tag (e.g. "kids out of school right now"), message is 1–2 kid-friendly sentences addressed to the user by name that frame it as motivation: they already have the launchpad, so their next step counts for more.
  • facts are 3 additional grounding stats (number + short label + one-line detail), each from a real global/UN/WHO/UNESCO/World Bank/ILO/WEF statistic.
  Prefer recent figures (last 5 years). Never fabricate — if unsure, use a well-known widely-cited figure.`;

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
      `Modules explored: ${data.slugs.join(", ")}`,
      ``,
      `Answers:`,
      ...data.answers.map((a, i) => `${i + 1}. [${a.moduleSlug}] Q: ${a.question}\n   A: ${a.answer}`),
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
      return { result: parsed };
    } catch {
      throw new Error("AI returned an invalid response. Please try again.");
    }
  });

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