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
  summary: {
    headline: string;
    bullets: string[];
    motivation?: string;
    strengths?: string[];
    growthAreas?: string[];
    personalityPattern?: string;
    learningStyle?: string;
    blindSpots?: string[];
    careerInsights?: string[];
    conclusion?: string;
  };
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
  age: z.number().int().min(10).max(27),
  education: z.string().optional(),
  skills: z.array(z.string()).optional(),
  customSkills: z.array(z.string()).optional(),
  goal: z.string().optional(),
  selfDescription: z.string().optional(),
  slugs: z.array(z.string()).min(1),
  answers: z.array(z.object({
    moduleSlug: z.string(),
    question: z.string(),
    answer: z.string().optional(),
    skipped: z.boolean().optional(),
  })),
});

const SYSTEM_PROMPT = `You are MyFlow, a warm, sharp coach for young people (ages 11–27). You synthesize a person's assessment answers into a personalized 5-panel dashboard.

CRITICAL: Return ONLY valid JSON (no markdown, no code fences) matching exactly this shape:
{
  "summary": {
    "headline": string,
    "bullets": string[3],
    "motivation": string,
    "strengths": string[3],
    "growthAreas": string[3],
    "personalityPattern": string,
    "learningStyle": string,
    "blindSpots": string[2],
    "careerInsights": string[3],
    "conclusion": string
  },
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
Ground every field in the user's ACTUAL answers, goal, self-description, age, and declared skills. NEVER use generic templates. If a question was SKIPPED, do not invent an answer for it — reason from what the user DID share. Adjust confidence accordingly. Address the user by name in motivation and conclusion.

Rules:
- summary.headline: one punchy line that captures who this specific person is right now.
- summary.bullets: 3 sharp observations tied to their answers, goal, and self-description.
- summary.strengths: 3 concrete strengths (e.g. "Pattern-spotting across messy data"), each tied to specific answers/skills.
- summary.growthAreas: 3 honest, kind growth edges. Frame as opportunities, not flaws.
- summary.personalityPattern: 2–3 sentences describing the recurring pattern in how they think/act, using evidence from answers.
- summary.learningStyle: 1–2 sentences on how they seem to learn best (visual, hands-on, discussion, solo deep-work, etc.), inferred from answers.
- summary.blindSpots: 2 potential blind spots to watch for — specific, not generic.
- summary.careerInsights: 3 career/path directions that fit their skills + goal + answers. Each 1 sentence, concrete.
- summary.motivation: 1–2 warm, personal sentences addressed to the user by name.
- summary.conclusion: a 2–3 sentence closing paragraph that ties strengths + goal + next step together, addressed to the user by name.
- roleModels: pick people whose age, era, or breakout moment is RELATABLE to the user's age. For ages 10–14: teen prodigies, young athletes/creators. For 15–18: teen founders, young activists, breakout artists. For 19–22: student entrepreneurs, young researchers/creators. For 23–27: early-career founders, rising professionals. Prefer contemporary figures the user could realistically look up today. Do NOT default to the same famous names for everyone — vary by the user's declared skills and goal.
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
      data.customSkills && data.customSkills.length ? `Custom skills (user-typed): ${data.customSkills.join(", ")}` : "",
      data.goal ? `Current goal: ${data.goal}` : `Current goal: (not provided)`,
      data.selfDescription ? `Self-description (one line): ${data.selfDescription}` : `Self-description: (not provided)`,
      `Modules explored: ${data.slugs.join(", ")}`,
      ``,
      `Answers:`,
      ...data.answers.map((a, i) =>
        `${i + 1}. [${a.moduleSlug}] Q: ${a.question}\n   A: ${a.skipped ? "SKIPPED" : (a.answer ?? "SKIPPED")}`
      ),
    ].filter(Boolean).join("\n");
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

// -------- PDF report --------

const ReportSchema = z.object({
  session: z.object({
    name: z.string(),
    age: z.number(),
    education: z.string().optional(),
    skills: z.array(z.string()).optional(),
    customSkills: z.array(z.string()).optional(),
    goal: z.string().optional(),
    selfDescription: z.string().optional(),
  }),
  answers: z.array(z.object({
    moduleSlug: z.string(),
    moduleTitle: z.string().optional(),
    question: z.string(),
    answer: z.string().optional(),
    skipped: z.boolean().optional(),
  })),
  result: z.any(),
});

export const generateReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReportSchema.parse(d))
  .handler(async ({ data }) => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const MARGIN = 56;
    const MAX_W = PAGE_W - MARGIN * 2;

    let page = pdf.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function newPage() {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    function ensure(h: number) {
      if (y - h < MARGIN) newPage();
    }
    function wrap(text: string, f: typeof font, size: number, maxW: number): string[] {
      const words = text.replace(/\s+/g, " ").split(" ");
      const lines: string[] = [];
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (f.widthOfTextAtSize(test, size) > maxW && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    }
    function draw(text: string, opts: { size?: number; font?: typeof font; color?: [number, number, number]; gap?: number } = {}) {
      const size = opts.size ?? 11;
      const f = opts.font ?? font;
      const color = opts.color ?? [0.15, 0.15, 0.2];
      const gap = opts.gap ?? 4;
      const map: Record<string, string> = {
        "\u2014": "-", "\u2013": "-",
        "\u2018": "'", "\u2019": "'",
        "\u201C": '"', "\u201D": '"',
        "\u2026": "...", "\u2022": "-",
        "\u2727": "*", "\u2726": "*", "\u2728": "*",
      };
      const safe = (text ?? "").replace(/[^\x20-\x7E]/g, (c) => map[c] ?? "");
      const lines = wrap(safe, f, size, MAX_W);
      for (const ln of lines) {
        ensure(size + gap);
        page.drawText(ln, { x: MARGIN, y: y - size, size, font: f, color: rgb(color[0], color[1], color[2]) });
        y -= size + gap;
      }
    }
    function heading(t: string) {
      y -= 10;
      ensure(24);
      draw(t, { size: 16, font: bold, color: [0.11, 0.23, 0.55], gap: 8 });
      ensure(2);
      page.drawLine({ start: { x: MARGIN, y: y }, end: { x: MARGIN + MAX_W, y: y }, thickness: 0.6, color: rgb(0.11, 0.23, 0.55) });
      y -= 10;
    }
    function sub(t: string) {
      y -= 4;
      draw(t, { size: 12, font: bold, color: [0.2, 0.2, 0.25], gap: 6 });
    }

    const s = data.session;
    const r = (data.result ?? {}) as DashboardResult;

    // Cover
    draw("MYFLOW", { size: 12, font: bold, color: [0.11, 0.23, 0.55], gap: 4 });
    y -= 20;
    draw("Personal Assessment Report", { size: 26, font: bold, gap: 10 });
    draw(`Prepared for ${s.name}`, { size: 14, font: italic, gap: 6 });
    draw(`Generated ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`, { size: 10, color: [0.4, 0.4, 0.45] });

    // Profile
    heading("Your Profile");
    draw(`Name: ${s.name}`);
    draw(`Age: ${s.age}`);
    if (s.education) draw(`Current stage: ${s.education}`);
    if (s.goal) draw(`Current goal: ${s.goal}`);
    if (s.selfDescription) draw(`In one line: "${s.selfDescription}"`);
    if (s.skills?.length) draw(`Skills: ${s.skills.join(", ")}`);
    if (s.customSkills?.length) draw(`Custom skills: ${s.customSkills.join(", ")}`);

    // Questionnaire
    heading("Your Responses");
    const grouped = new Map<string, typeof data.answers>();
    for (const a of data.answers) {
      const key = a.moduleTitle || a.moduleSlug;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(a);
    }
    for (const [mod, list] of grouped) {
      sub(mod);
      list.forEach((a, i) => {
        draw(`${i + 1}. ${a.question}`, { size: 10, font: bold });
        draw(a.skipped ? "   [Skipped]" : `   ${a.answer ?? "[Skipped]"}`, { size: 10, color: a.skipped ? [0.55, 0.55, 0.6] : [0.2, 0.2, 0.25], gap: 6 });
      });
    }

    // Analysis
    heading("Personality Analysis");
    if (r.summary?.headline) draw(r.summary.headline, { size: 13, font: bold, gap: 8 });
    if (r.summary?.personalityPattern) { sub("Personality pattern"); draw(r.summary.personalityPattern); }
    if (r.summary?.learningStyle) { sub("Learning style"); draw(r.summary.learningStyle); }
    if (r.summary?.bullets?.length) {
      sub("Key observations");
      r.summary.bullets.forEach((b) => draw(`- ${b}`));
    }

    if (r.summary?.strengths?.length) {
      heading("Strengths");
      r.summary.strengths.forEach((b) => draw(`- ${b}`));
    }
    if (r.summary?.growthAreas?.length) {
      heading("Growth Areas");
      r.summary.growthAreas.forEach((b) => draw(`- ${b}`));
    }
    if (r.summary?.blindSpots?.length) {
      sub("Potential blind spots");
      r.summary.blindSpots.forEach((b) => draw(`- ${b}`));
    }

    if (r.summary?.careerInsights?.length || r.opportunities?.length) {
      heading("Career Insights & Opportunities");
      r.summary?.careerInsights?.forEach((b) => draw(`- ${b}`));
      if (r.opportunities?.length) {
        sub("Opportunities to explore");
        r.opportunities.forEach((o) => {
          draw(`- ${o.title} (${o.org}) - ${o.stipend} [${o.confidence}]`, { size: 10 });
          if (o.url) draw(`   ${o.url}`, { size: 9, color: [0.3, 0.4, 0.7] });
        });
      }
    }

    if (r.roleModels?.length) {
      heading("Recommended Role Models");
      r.roleModels.forEach((rm) => {
        draw(rm.name, { size: 12, font: bold, gap: 3 });
        draw(rm.why, { size: 10, gap: 8 });
      });
    }

    if (r.roadmap?.length) {
      heading("Your Roadmap");
      r.roadmap.forEach((m) => {
        draw(m.horizon, { size: 11, font: bold, gap: 3 });
        draw(m.action, { size: 10, gap: 8 });
      });
    }

    if (r.summary?.conclusion || r.summary?.motivation) {
      heading("A Note for You");
      if (r.summary?.motivation) draw(r.summary.motivation, { font: italic });
      if (r.summary?.conclusion) draw(r.summary.conclusion);
    }

    const bytes = await pdf.save();
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const base64 = btoa(bin);
    const safeName = s.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "report";
    return { pdfBase64: base64, filename: `myflow-${safeName}.pdf` };
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