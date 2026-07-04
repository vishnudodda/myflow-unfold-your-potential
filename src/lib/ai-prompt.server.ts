import type { Json } from "@/integrations/supabase/types";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export type PromptRow = {
  slug: string;
  version: number;
  system_prompt: string;
  user_template: string;
  model: string;
};

export async function loadPrompt(slug: string): Promise<PromptRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ai_prompts")
    .select("slug, version, system_prompt, user_template, model")
    .eq("slug", slug)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error(`Prompt "${slug}" not configured`);
  return data as PromptRow;
}

export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{{${k}}}`, v);
  return out;
}

export async function runPrompt(prompt: PromptRow, vars: Record<string, string>): Promise<Json> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI gateway not configured");
  const gateway = createLovableAiGatewayProvider(key);
  const userMsg = renderTemplate(prompt.user_template, vars);
  const { text } = await generateText({
    model: gateway(prompt.model),
    system: `${prompt.system_prompt}\n\nCRITICAL: Respond with valid JSON only, no markdown code fences.`,
    prompt: userMsg,
  });
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as Json;
  } catch {
    return { raw: text.slice(0, 2000) } as Json;
  }
}

export async function gatherProfileContext(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
): Promise<string> {
  const [{ data: profile }, { data: results }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, age_band, goals, education_level, country, work_mode, experience_level")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("ai_results")
      .select("prompt_slug, output, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return JSON.stringify({ profile, assessment_results: results ?? [] });
}