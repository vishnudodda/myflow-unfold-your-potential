
# MyFlow — Implementation Plan

Building the full PRD is a multi-turn effort. This plan sequences it so each phase ships something usable, and nothing is thrown away later. I'll start Phase 0 immediately after approval.

## Phase 0 — Foundation (this turn after approval)

1. Enable **Lovable Cloud** (Postgres + Auth) and provision **LOVABLE_API_KEY** for Lovable AI Gateway (Gemini).
2. Configure **Email + Google** sign-in.
3. Generate **3 rendered design directions** for the landing + dashboard using the "premium, Notion/Linear/Coursera-grade" brief from the PRD. You pick one; I lock its tokens (palette, type, radii, spacing) into `src/styles.css` and use them across every screen going forward.

Once you pick a direction, everything else uses it — no redesigns per module.

## Phase 1 — Auth, shell, onboarding

- Landing page (marketing) with SEO metadata.
- `/auth` (email + Google) with `_authenticated` gate.
- Onboarding flow: age band (11–27), goals, module recommendation.
- App shell: sidebar nav, top bar, mobile responsive.
- DB: `profiles`, `user_roles` (with `has_role()`), `activity_logs`, `notifications`, `settings`.

## Phase 2 — Questionnaire + AI engine (the core loop)

The PRD's heart. Built as a reusable engine so all 9 modules share it.

- Schema: `assessment_categories`, `assessments`, `questions`, `question_options`, `user_responses`, `ai_results`, `ai_prompts` (versioned, editable by admin — decouples prompts from code per PRD §7).
- Multi-step questionnaire component (progress bar, autosave, resume).
- AI processing pipeline: server function → Lovable AI Gateway (Gemini 3 Flash) → structured JSON output → persist to `ai_results`.
- Weighted-vector scoring utility.
- Results view: SWOT, personality summary, confidence scores, reasoning (per PRD §7.8–7.9).

Seed all 9 questionnaires from PRD §8 (Self Identity, Values, Deep Insights, Purpose, Unlock Potential, Career Discovery, Career Compass, Habits, Financial) — 10 questions × 4 options each.

## Phase 3 — Recommendation + Opportunity engines

- Tables: `career_matches`, `learning_resources`, `role_models`, `success_stories`, `opportunities` (internships/scholarships).
- Prompt library (PRD §13) as versioned rows in `ai_prompts`: Internship Suggestions, Self-Awareness Summary, Role Models, Learning Videos, Power Stats.
- Recommendation cards, filters, ranking, trust score, expiration handling (§10.6).
- Opportunity engine: live search stubbed initially (mock feed) with real integration points documented for later (Serper/Tavily/Google CSE).

## Phase 4 — Growth Roadmap + Power Statistics

- Roadmap engine (PRD §12): 5-stage pipeline → 30-day / 3-month / 6-month / 1-year plan with skills, resources, opportunities linked.
- Roadmap UI: timeline, milestones, week-by-week action plan, check-in.
- Power Stats dashboard (§11): benchmarks, percentile framing, motivation copy.
- Progress tracking: habit check-ins, completed milestones, re-assessment prompts.

## Phase 5 — Admin panel

- Role-gated `/admin` (admin role via `user_roles` + `has_role()`).
- CRUD: users, questionnaires, questions, AI prompts (edit + version), categories, recommendations, opportunities, learning resources.
- Analytics: signups, completions per module, AI cost/latency, active users.

## Phase 6 — Polish

- Reports export (PDF), notifications, deep charts (Recharts), rate limits, audit logs, error boundaries per route, SEO on all public routes, a11y pass.

---

## Technical details

**Stack (locked by template):** TanStack Start + React 19, Tailwind v4, shadcn, TanStack Query, Lovable Cloud (Supabase managed), Lovable AI Gateway.

**Routing:**
```
/                       landing
/auth                   sign in / up
/onboarding             (authenticated)
/_authenticated/
  dashboard             hub
  assessments           list + progress
  assessments/$slug     questionnaire
  results/$id           AI output
  roadmap               growth plan
  recommendations       careers / learning / opportunities / role models
  progress              tracking + power stats
  profile
  settings
/_authenticated/_admin/*  admin panel
```

**AI layer:** every prompt is a DB row (`ai_prompts`, keyed by `slug` + `version`). Server function loads the prompt, injects user context, calls Gemini via the gateway helper (`src/lib/ai-gateway.server.ts` per the AI SDK knowledge), enforces structured output via zod schema, persists result. Prompts are editable in admin without a redeploy — this satisfies PRD §7 "prompts can be updated without modifying application logic".

**Security:** RLS on every table scoped to `auth.uid()`; admin operations gated by `has_role(auth.uid(),'admin')`; service-role client only for verified webhooks/admin fns; financial data (§6.9) treated as sensitive per §15.8.

**Data model highlights (Phase 2):**
```
profiles(user_id, age_band, display_name, avatar_url, onboarded_at)
user_roles(user_id, role)          -- app_role enum
assessment_categories(slug, name, order)
assessments(slug, category_id, title, description)
questions(assessment_id, order, text)
question_options(question_id, label, value, trait_weights jsonb)
user_responses(user_id, question_id, option_id, created_at)
ai_prompts(slug, version, system_prompt, user_template, output_schema, active)
ai_results(user_id, assessment_id, prompt_slug, prompt_version, output jsonb, confidence, created_at)
```

---

## What I need from you now

1. **Approve this plan.**
2. After approval, I'll enable Cloud + AI key and render the 3 design directions in the next turn. You pick one, then I execute Phases 1→6.

Each subsequent phase is 1–2 turns; I'll pause between phases so you can steer.
