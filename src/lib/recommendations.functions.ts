import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPrompt, runPrompt, gatherProfileContext } from "./ai-prompt.server";

type Obj = Record<string, unknown>;
const asArray = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const asStr = (v: unknown): string | null => (typeof v === "string" ? v : null);
const asNum = (v: unknown): number | null => (typeof v === "number" ? v : null);
const asDate = (v: unknown): string | null => {
  const s = asStr(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const asConfidence = (v: unknown): string | null => {
  const s = asStr(v);
  if (!s) return null;
  const u = s.toLowerCase();
  if (u.startsWith("h")) return "high";
  if (u.startsWith("m")) return "medium";
  if (u.startsWith("l")) return "low";
  return null;
};
const asStrArr = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).filter((x) => typeof x === "string") as string[] : []);

function mapOpp(userId: string, o: Obj) {
  return {
    user_id: userId,
    kind: asStr(o.kind) ?? asStr(o.type) ?? "internship",
    title: asStr(o.title) ?? asStr(o.name) ?? "Opportunity",
    organization: asStr(o.organization) ?? asStr(o.company) ?? asStr(o.host),
    location: asStr(o.location) ?? asStr(o.city),
    is_remote: typeof o.is_remote === "boolean" ? o.is_remote : /remote/i.test(asStr(o.location) ?? ""),
    url: asStr(o.url) ?? asStr(o.link) ?? asStr(o.application_link),
    description: asStr(o.description) ?? asStr(o.summary) ?? asStr(o.duration),
    match_reason: asStr(o.match_reason) ?? asStr(o.reason) ?? asStr(o.why) ?? asStr(o.why_it_matches),
    trust_score: asNum(o.trust_score) ?? 0.7,
    posted_date: asDate(o.posted_date ?? o.posted ?? o.posted_at),
    deadline: asDate(o.deadline ?? o.application_deadline ?? o.deadline_date),
    stipend: asStr(o.stipend) ?? asStr(o.compensation) ?? asStr(o.pay),
    required_skills: asStrArr(o.required_skills ?? o.skills),
    confidence: asConfidence(o.confidence ?? o.confidence_still_open ?? o.is_open),
  };
}

async function ensureSomeContext(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
) {
  const [{ count: rCount }, { count: aCount }] = await Promise.all([
    supabase.from("user_responses").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("ai_results").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if ((rCount ?? 0) === 0 && (aCount ?? 0) === 0) {
    throw new Error("Complete at least one assessment first");
  }
}

// ---------------- Opportunities (standalone) ----------------

export const generateOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      await ensureSomeContext(supabase, userId);
      const profileCtx = await gatherProfileContext(supabase, userId);
      const prompt = await loadPrompt("internship-opportunities");
      const out = await runPrompt(prompt, { profile: profileCtx, responses: "" });
      const opps = asArray((out as Obj).opportunities ?? (out as Obj).internships ?? out).slice(0, 12);
      const rows = opps.map((o) => mapOpp(userId, o)).filter((r) => r.title && r.title !== "Opportunity");
      await supabase.from("opportunities").delete().eq("user_id", userId);
      if (rows.length) {
        const { error } = await supabase.from("opportunities").insert(rows);
        if (error) throw error;
      }
      return { inserted: rows.length };
    } catch (err) {
      console.error("[generateOpportunities]", err);
      throw err instanceof Error ? err : new Error("Opportunity generation failed");
    }
  });

export const getOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("opportunities")
      .select("*")
      .eq("user_id", context.userId)
      .order("trust_score", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const generateRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureSomeContext(supabase, userId);

    const profileCtx = await gatherProfileContext(supabase, userId);

    async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
      try { return await fn(); } catch (e) { console.error(`[recs:${label}]`, e); return null; }
    }

    const [careerOut, learningOut, roleOut, oppOut] = await Promise.all([
      safe("careers", async () => runPrompt(await loadPrompt("analyze-career-discovery"), { profile: profileCtx, responses: "" })),
      safe("learning", async () => runPrompt(await loadPrompt("learning-recommendations"), { profile: profileCtx, responses: "" })),
      safe("roles", async () => runPrompt(await loadPrompt("role-model-stories"), { profile: profileCtx, responses: "" })),
      safe("opps", async () => runPrompt(await loadPrompt("internship-opportunities"), { profile: profileCtx, responses: "" })),
    ]);

    // Clear old rows only for sections we regenerated successfully.
    const errors: string[] = [];
    const counts = { careers: 0, learning: 0, role_models: 0, opportunities: 0 };

    if (careerOut) {
      const careers = asArray((careerOut as Obj).careers ?? (careerOut as Obj).matches ?? careerOut).slice(0, 8);
    const careerRows = careers
      .map((c) => ({
        user_id: userId,
        title: asStr(c.title) ?? asStr(c.name) ?? "Career",
        industry: asStr(c.industry),
        match_score: asNum(c.match_score) ?? asNum(c.score) ?? 75,
        reasoning: asStr(c.reasoning) ?? asStr(c.why),
        required_skills: Array.isArray(c.required_skills) ? (c.required_skills as string[]) : Array.isArray(c.skills) ? (c.skills as string[]) : [],
      }))
      .filter((r) => r.title !== "Career" || r.reasoning);
      await supabase.from("career_matches").delete().eq("user_id", userId);
      if (careerRows.length) await supabase.from("career_matches").insert(careerRows);
      counts.careers = careerRows.length;
    } else errors.push("careers");

    if (learningOut) {
      const learning = asArray((learningOut as Obj).resources ?? (learningOut as Obj).learning ?? learningOut).slice(0, 12);
      const learningRows = learning
      .map((l) => ({
        user_id: userId,
        kind: asStr(l.kind) ?? asStr(l.type) ?? "course",
        title: asStr(l.title) ?? "Resource",
        creator: asStr(l.creator) ?? asStr(l.author),
        url: asStr(l.url) ?? "https://www.google.com/search?q=" + encodeURIComponent(asStr(l.title) ?? ""),
        duration: asStr(l.duration),
        reason: asStr(l.reason) ?? asStr(l.why),
        skill_tag: asStr(l.skill_tag) ?? asStr(l.skill),
      }));
      await supabase.from("learning_resources").delete().eq("user_id", userId);
      if (learningRows.length) await supabase.from("learning_resources").insert(learningRows);
      counts.learning = learningRows.length;
    } else errors.push("learning");

    if (roleOut) {
      const roles = asArray((roleOut as Obj).role_models ?? (roleOut as Obj).people ?? roleOut).slice(0, 8);
      const roleRows = roles.map((r) => ({
      user_id: userId,
      name: asStr(r.name) ?? "Role Model",
      title: asStr(r.title) ?? asStr(r.role),
      bio: asStr(r.bio),
      story: asStr(r.story),
      reason: asStr(r.reason) ?? asStr(r.why),
    }));
      await supabase.from("role_models").delete().eq("user_id", userId);
      if (roleRows.length) await supabase.from("role_models").insert(roleRows);
      counts.role_models = roleRows.length;
    } else errors.push("role_models");

    if (oppOut) {
      const opps = asArray((oppOut as Obj).opportunities ?? (oppOut as Obj).internships ?? oppOut).slice(0, 12);
      const oppRows = opps.map((o) => mapOpp(userId, o)).filter((r) => r.title && r.title !== "Opportunity");
      await supabase.from("opportunities").delete().eq("user_id", userId);
      if (oppRows.length) await supabase.from("opportunities").insert(oppRows);
      counts.opportunities = oppRows.length;
    } else errors.push("opportunities");

    return {
      ...counts,
      errors,
    };
  });

export const getRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [careers, learning, roles, opps] = await Promise.all([
      supabase.from("career_matches").select("*").eq("user_id", userId).order("match_score", { ascending: false }),
      supabase.from("learning_resources").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("role_models").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("opportunities").select("*").eq("user_id", userId).order("trust_score", { ascending: false }),
    ]);
    return {
      careers: careers.data ?? [],
      learning: learning.data ?? [],
      role_models: roles.data ?? [],
      opportunities: opps.data ?? [],
    };
  });