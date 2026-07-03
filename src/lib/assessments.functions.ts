import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

export const analyzeAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ assessmentSlug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: asmt, error: aErr } = await supabase
      .from("assessments")
      .select("id, slug, title, prompt_slug, category_id")
      .eq("slug", data.assessmentSlug)
      .maybeSingle();
    if (aErr || !asmt) throw new Error("Assessment not found");

    const { data: responses } = await supabase
      .from("user_responses")
      .select("question_id, option_id, questions(text, sort_order), question_options(label, value, trait_weights)")
      .eq("user_id", userId)
      .eq("assessment_id", asmt.id);

    if (!responses || responses.length < 1) throw new Error("Complete the questionnaire first");

    const { data: prompt } = await supabase
      .from("ai_prompts")
      .select("*")
      .eq("slug", asmt.prompt_slug ?? `analyze-${asmt.slug}`)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prompt) throw new Error("Prompt not configured");

    const { data: profile } = await supabase.from("profiles").select("age_band, display_name, goals").eq("user_id", userId).maybeSingle();

    // Compute trait vector
    const traits: Record<string, number> = {};
    const respLines: string[] = [];
    for (const r of responses as Array<{
      questions: { text: string; sort_order: number } | null;
      question_options: { label: string; value: string; trait_weights: Record<string, number> } | null;
    }>) {
      const q = r.questions;
      const o = r.question_options;
      if (!q || !o) continue;
      respLines.push(`Q${q.sort_order}. ${q.text} → ${o.label}`);
      for (const [k, v] of Object.entries(o.trait_weights || {})) {
        traits[k] = (traits[k] || 0) + (v as number);
      }
    }

    const profileStr = JSON.stringify({ ...profile, dominant_traits: traits });
    const userMsg = (prompt.user_template as string)
      .replaceAll("{{profile}}", profileStr)
      .replaceAll("{{responses}}", respLines.join("\n"));

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");
    const gateway = createLovableAiGatewayProvider(key);

    const { text, response } = await generateText({
      model: gateway(prompt.model as string),
      system: `${prompt.system_prompt}\n\nCRITICAL: Respond with valid JSON only, no markdown fences.`,
      prompt: userMsg,
    });

    let output: Json = {};
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      output = JSON.parse(cleaned) as Json;
    } catch {
      output = { summary: text.slice(0, 500), raw: true };
    }

    const { data: saved, error: sErr } = await supabase
      .from("ai_results")
      .insert({
        user_id: userId,
        assessment_id: asmt.id,
        prompt_slug: prompt.slug,
        prompt_version: prompt.version,
        output,
        confidence:
          output && typeof output === "object" && !Array.isArray(output) && typeof (output as Record<string, unknown>).confidence === "number"
            ? ((output as Record<string, number>).confidence)
            : null,
        model: prompt.model,
      })
      .select()
      .single();
    if (sErr) throw sErr;

    await supabase.from("user_assessments").upsert(
      {
        user_id: userId,
        assessment_id: asmt.id,
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,assessment_id" },
    );

    return { resultId: saved.id as string, output: output as unknown as Record<string, unknown> };
  });