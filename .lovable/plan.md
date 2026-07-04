## Goal
Ship a fully-functional MyFlow app: remove the "Nine Pillars" tagline, fix the flow so users can move all the way from assessment → results → recommendations → roadmap without dead-ends, and finish the half-built Opportunities / Recommendations / Roadmap / Power Stats surfaces so every button leads to real, AI-generated content.

## 1. Remove the "Nine Pillars" tagline
- **`src/routes/_authenticated/dashboard.tsx`** — delete the `<h2>The Nine Pillars</h2>` block above the grid. Keep the module grid + the 10th "Growth Roadmap" tile.
- **`src/routes/index.tsx`** — rename the landing section from "The Nine Pillars" to a neutral heading ("The Assessment" / "Nine modules, one map") so the phrase is gone from the marketing page too.

## 2. Fix "unable to move to next feature"
Root cause: on the last question the auto-advance stops and the "Submit & analyze" button is the only way forward, which is confusing after the earlier questions auto-advanced.
- Keep auto-advance for questions 1..N-1.
- On the **last** question, auto-trigger `submit()` ~350 ms after the final option is chosen (still show the button as a manual fallback with a clear "Submit & analyze" label).
- Add a visible toast ("Saving your answers…" → "Analyzing…") and a blocking overlay so users see progress instead of a frozen screen while the AI runs.
- After navigate to `/results/$id`, add a persistent bottom action bar on the results page with **primary CTAs** so users always know where to go next:
  - `Generate my recommendations →` (`/recommendations`)
  - `Build my growth roadmap →` (`/roadmap`)
  - `Back to dashboard`

## 3. Finish the Recommendations surface (opportunities, careers, learning, role models)
Currently a placeholder page. Build it out end-to-end.

**New server functions** in `src/lib/recommendations.functions.ts` (all `.middleware([requireSupabaseAuth])`, prompts loaded via admin client to bypass RLS on `ai_prompts` — same pattern as the assessment fix):
- `generateRecommendations()` — aggregates the user's completed `ai_results`, calls Lovable AI Gateway (`google/gemini-3-flash-preview`) using the seeded prompts (`analyze-career-discovery`, `learning-recommendations`, `role-model-stories`, `internship-opportunities`), and upserts rows into `career_matches`, `learning_resources`, `role_models`, `opportunities`.
- `getRecommendations()` — reads all four tables for the current user.

**`src/routes/_authenticated/recommendations.tsx`** — real UI:
- Header + summary of how many assessments feed the recommendations.
- Empty state with a `Generate recommendations` button when tables are empty.
- Four tabbed sections (shadcn `Tabs`): **Careers**, **Learning**, **Role Models**, **Opportunities**.
- Each tab shows cards with title, reasoning/reason, match score / trust score, external URL (opens in new tab), skill/industry tags.
- Regenerate button (rate-limited by disabled state while loading) to re-run the AI.

## 4. Finish the Roadmap surface
Currently a placeholder. Build:
- `generateRoadmap()` server function — uses the seeded `growth-roadmap` prompt + user's ai_results + optional target career from `career_matches`; writes a row in `roadmaps` (with `content` JSONB containing 30-day / 3-month / 6-month / 1-year buckets) and inserts `roadmap_milestones` rows per horizon.
- `getRoadmap()` / `toggleMilestone()` server functions.
- **`src/routes/_authenticated/roadmap.tsx`** — timeline view with four horizon sections, milestone checklist (checkbox toggles `completed_at`), progress ring per horizon, empty state + `Generate my roadmap` CTA.

## 5. Finish the Power Statistics surface
- `generatePowerStats()` server function — uses the `power-statistics` prompt to produce label/value/benchmark/narrative rows and inserts into `power_stats`.
- New route **`src/routes/_authenticated/stats.tsx`** — grid of stat cards (label, big value, benchmark line, short narrative). Empty state + generate button.
- Add `Stats` link to the top nav on dashboard.

## 6. Dashboard polish so nothing is a dead-end
- Dashboard: after removing the tagline, add three CTA tiles below the module grid — **Recommendations**, **Growth Roadmap**, **Power Stats** — each linking to the routes above and showing a small state indicator (e.g. "Not generated yet" / "Last updated 2 days ago").
- Results page: bottom CTA bar (from step 2) plus a small "Next steps" section listing the three follow-on surfaces.

## 7. Guardrails / small fixes
- All new server functions load `ai_prompts` via `supabaseAdmin` (dynamic import inside handler) — the RLS on `ai_prompts` is admin-only, same fix as `analyzeAssessment`.
- All AI calls include the `system_prompt` + templated `user_template`, response parsed as JSON with a fallback wrapper (same shape as `analyzeAssessment`).
- Handle 429 / 402 from the gateway with a clear toast ("Rate limited, try again in a minute" / "Out of AI credits — top up in Settings").
- Every new route gets a `head()` with unique title + description.
- Every table write includes `user_id: context.userId`.
- No changes to `ai_prompts` / `assessments` seed data — reuse what's already in the DB.

## Technical notes
- Stack: TanStack Start server functions (`createServerFn` from `@tanstack/react-start`), authenticated via `requireSupabaseAuth`.
- AI: Lovable AI Gateway via existing `createLovableAiGatewayProvider` in `src/lib/ai-gateway.server.ts`.
- No new tables required — `opportunities`, `career_matches`, `learning_resources`, `role_models`, `roadmaps`, `roadmap_milestones`, `power_stats` already exist with correct RLS.
- No new packages needed.

## Files touched
- Edit: `src/routes/index.tsx`, `src/routes/_authenticated/dashboard.tsx`, `src/routes/_authenticated/assessments.$slug.tsx`, `src/routes/_authenticated/results.$id.tsx`, `src/routes/_authenticated/recommendations.tsx`, `src/routes/_authenticated/roadmap.tsx`
- Create: `src/lib/recommendations.functions.ts`, `src/lib/roadmap.functions.ts`, `src/lib/stats.functions.ts`, `src/routes/_authenticated/stats.tsx`
