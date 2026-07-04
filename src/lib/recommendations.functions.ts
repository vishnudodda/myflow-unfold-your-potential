import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPrompt, runPrompt, gatherProfileContext } from "./ai-prompt.server";

type Obj = Record<string, unknown>;
const asArray = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const asStr = (v: unknown): string | null => (typeof v === "string" ? v : null);
const asNum = (v: unknown): number | null => (typeof v === "number" ? v : null);

export const generateRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: results } = await supabase
      .from("ai_results")
      .select("id")
      .eq("user_id", userId);
    if (!results || results.length === 0) {
      throw new Error("Complete at least one assessment first");
    }

    const profileCtx = await gatherProfileContext(supabase, userId);

    const [careerP, learningP, roleP, oppP] = await Promise.all([
      loadPrompt("analyze-career-discovery"),
      loadPrompt("learning-recommendations"),
      loadPrompt("role-model-stories"),
      loadPrompt("internship-opportunities"),
    ]);

    const [careerOut, learningOut, roleOut, oppOut] = await Promise.all([
      runPrompt(careerP, { profile: profileCtx, responses: "" }),
      runPrompt(learningP, { profile: profileCtx, responses: "" }),
      runPrompt(roleP, { profile: profileCtx, responses: "" }),
      runPrompt(oppP, { profile: profileCtx, responses: "" }),
    ]);

    // Clear old rows, insert fresh
    await Promise.all([
      supabase.from("career_matches").delete().eq("user_id", userId),
      supabase.from("learning_resources").delete().eq("user_id", userId),
      supabase.from("role_models").delete().eq("user_id", userId),
      supabase.from("opportunities").delete().eq("user_id", userId),
    ]);

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
    if (careerRows.length) await supabase.from("career_matches").insert(careerRows);

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
    if (learningRows.length) await supabase.from("learning_resources").insert(learningRows);

    const roles = asArray((roleOut as Obj).role_models ?? (roleOut as Obj).people ?? roleOut).slice(0, 8);
    const roleRows = roles.map((r) => ({
      user_id: userId,
      name: asStr(r.name) ?? "Role Model",
      title: asStr(r.title) ?? asStr(r.role),
      bio: asStr(r.bio),
      story: asStr(r.story),
      reason: asStr(r.reason) ?? asStr(r.why),
    }));
    if (roleRows.length) await supabase.from("role_models").insert(roleRows);

    const opps = asArray((oppOut as Obj).opportunities ?? (oppOut as Obj).internships ?? oppOut).slice(0, 10);
    const oppRows = opps.map((o) => ({
      user_id: userId,
      kind: asStr(o.kind) ?? asStr(o.type) ?? "internship",
      title: asStr(o.title) ?? "Opportunity",
      organization: asStr(o.organization) ?? asStr(o.company),
      location: asStr(o.location),
      is_remote: typeof o.is_remote === "boolean" ? o.is_remote : false,
      url: asStr(o.url),
      description: asStr(o.description),
      match_reason: asStr(o.match_reason) ?? asStr(o.reason),
      trust_score: asNum(o.trust_score) ?? 0.7,
    }));
    if (oppRows.length) await supabase.from("opportunities").insert(oppRows);

    return {
      careers: careerRows.length,
      learning: learningRows.length,
      role_models: roleRows.length,
      opportunities: oppRows.length,
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