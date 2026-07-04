import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPrompt, runPrompt, gatherProfileContext } from "./ai-prompt.server";

type Obj = Record<string, unknown>;
const asArray = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const asStr = (v: unknown): string | null => (typeof v === "string" ? v : null);

export const generatePowerStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const profileCtx = await gatherProfileContext(supabase, userId);
    const prompt = await loadPrompt("power-statistics");
    const output = (await runPrompt(prompt, { profile: profileCtx, responses: "" })) as Obj;

    const stats = asArray(output.stats ?? output.statistics ?? output).slice(0, 12);
    await supabase.from("power_stats").delete().eq("user_id", userId);
    const rows = stats.map((s) => ({
      user_id: userId,
      label: asStr(s.label) ?? asStr(s.name) ?? "Stat",
      value: asStr(s.value) ?? String(s.value ?? "—"),
      benchmark: asStr(s.benchmark),
      narrative: asStr(s.narrative) ?? asStr(s.description),
      source: asStr(s.source) ?? asStr(s.citation),
      is_estimate: typeof s.is_estimate === "boolean" ? s.is_estimate : true,
    }));
    if (rows.length) await supabase.from("power_stats").insert(rows);
    return { count: rows.length };
  });

export const getPowerStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("power_stats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { stats: data ?? [] };
  });