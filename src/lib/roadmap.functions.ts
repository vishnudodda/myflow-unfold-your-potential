import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { loadPrompt, runPrompt, gatherProfileContext } from "./ai-prompt.server";

type Obj = Record<string, unknown>;
const asArray = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const asStr = (v: unknown): string | null => (typeof v === "string" ? v : null);

const HORIZONS = ["30_day", "3_month", "6_month", "1_year"] as const;

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const profileCtx = await gatherProfileContext(supabase, userId);
    const { data: topCareer } = await supabase
      .from("career_matches")
      .select("title")
      .eq("user_id", userId)
      .order("match_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prompt = await loadPrompt("growth-roadmap");
    const output = await runPrompt(prompt, {
      profile: profileCtx,
      target_career: topCareer?.title ?? "unspecified",
      responses: "",
    }) as Obj;

    // Deactivate old roadmaps
    await supabase.from("roadmaps").update({ is_active: false }).eq("user_id", userId);

    const { data: roadmap, error } = await supabase
      .from("roadmaps")
      .insert({
        user_id: userId,
        title: asStr(output.title) ?? "Your Growth Roadmap",
        summary: asStr(output.summary),
        target_career: topCareer?.title ?? null,
        horizon: "1_year",
        content: output as never,
        is_active: true,
      })
      .select()
      .single();
    if (error) throw error;

    const milestones: Array<{ user_id: string; roadmap_id: string; title: string; description: string | null; horizon: string; sort_order: number }> = [];
    for (const h of HORIZONS) {
      const bucket = asArray((output[h] as Obj) ?? (output[h.replace("_", "")] as Obj) ?? []);
      bucket.forEach((m, i) => {
        milestones.push({
          user_id: userId,
          roadmap_id: roadmap.id,
          title: asStr(m.title) ?? asStr(m.action) ?? "Milestone",
          description: asStr(m.description) ?? asStr(m.detail),
          horizon: h,
          sort_order: i,
        });
      });
    }
    if (milestones.length) await supabase.from("roadmap_milestones").insert(milestones);

    return { roadmapId: roadmap.id, count: milestones.length };
  });

export const getRoadmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roadmap } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!roadmap) return { roadmap: null, milestones: [] };
    const { data: milestones } = await supabase
      .from("roadmap_milestones")
      .select("*")
      .eq("roadmap_id", roadmap.id)
      .order("horizon")
      .order("sort_order");
    return { roadmap, milestones: milestones ?? [] };
  });

export const toggleMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string(), completed: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("roadmap_milestones")
      .update({ completed_at: data.completed ? new Date().toISOString() : null })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true };
  });