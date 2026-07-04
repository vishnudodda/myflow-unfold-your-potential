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
  roleModels: Array<{ name: string; why: string }>;
  roadmap: Array<{ horizon: string; action: string }>;
  opportunities: Array<{ title: string; org: string; stipend: string; confidence: string }>;
  podcasts: Array<{ title: string; host: string; pitch: string; url?: string }>;
};

const AnalyzeSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().min(8).max(99),
  slugs: z.array(z.string()).min(1),
  answers: z.array(z.object({ moduleSlug: z.string(), question: z.string(), answer: z.string() })),
});

const SYSTEM_PROMPT = `You are MyFlow, a warm, sharp coach for young people (ages 11–27). You synthesize a person's assessment answers into a personalized 5-panel dashboard.

CRITICAL: Return ONLY valid JSON (no markdown, no code fences) matching exactly this shape:
{
  "summary": { "headline": string, "bullets": string[3], "motivation": string },
  "roleModels": [ { "name": string, "why": string } ] (exactly 3),
  "roadmap": [ { "horizon": "30 days"|"3 months"|"6 months"|"1 year", "action": string } ] (exactly 4, in that order),
  "opportunities": [ { "title": string, "org": string, "stipend": string, "confidence": "High"|"Medium"|"Low" } ] (exactly 3),
  "podcasts": [ { "title": string, "host": string, "pitch": string, "url": string } ] (exactly 3)
}
Ground every field in the user's answers. No generic filler. No disclaimers.

Rules:
- summary.motivation: 1–2 warm, personal sentences of encouragement addressed to the user by name.
- roleModels: pick people whose age, era, or breakout moment is RELATABLE to the user's age (e.g. teen prodigies for age 13, early-career founders for 22). Prefer contemporary figures the user could realistically look up today.
- podcasts.url: a real, direct https link (Spotify, Apple Podcasts, YouTube, or the show's official site). Never invent a broken URL — if unsure, link to the show's Spotify or Apple Podcasts search page.`;

export const analyzeGuest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalyzeSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const userMsg = [
      `Name: ${data.name}`,
      `Age: ${data.age}`,
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
      return { result: parsed };
    } catch {
      throw new Error("AI returned an invalid response. Please try again.");
    }
  });