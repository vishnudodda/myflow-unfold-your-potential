# Complete MYFLOW to PRD v1.0

Scope: the 32-page PRD. I'll close every functional gap between what exists and what the PRD requires, in one build pass. No design overhaul — the "Precision editorial" direction stays.

## What already exists (keep)
- Auth (email + Google), 9 assessment modules + 90 questions in DB, per-question weighted trait vectors, `ai_prompts` table with 15 prompts, `ai_results` per module, dashboard, per-module `results/$id` page, Recommendations page with 4 tabs, Roadmap milestone page, Power Stats page, Profile page.

## Gaps vs PRD (what I'll build)

### 1. Assessment reliability (§6, §8)
- Verify the recent fix (answersRef, submittingRef, per-run error toast) makes the Submit / auto-advance path reliable on the last question.
- Add "low-confidence" flag when a user picks the same letter for all 10 answers (§6.1 Edge Cases). Store on `ai_results.confidence`.
- Loading overlay stays; on failure surface the underlying error instead of "Submission failed".

### 2. Registration profile fields (§5, §7.2)
PRD requires age, education level, location, preferred work mode as prompt context. Currently only `age_band`, `display_name`, `goals` exist.
- Migration: add `education_level`, `country`, `work_mode`, `experience_level` to `profiles` (nullable, backfill-safe).
- One-time onboarding step after signup + editable on `/profile`.
- Include all fields in every prompt context builder (`gatherProfileContext`).

### 3. Opportunity Engine (§10, §13.1)
Align schema, prompt, and UI to the PRD output format.
- Migration: add `posted_date`, `deadline`, `stipend`, `required_skills text[]`, `confidence` (High/Medium/Low) to `opportunities`.
- Update the `internship-opportunities` prompt in DB to force JSON with all §10.7 fields + the "never fabricate" clause verbatim.
- Update `generateOpportunities` mapper + Opportunities tab card to show all fields (Company · Location · Posted · Deadline · Stipend · Confidence badge · Why-it-matches · Apply link).
- Empty-state copy: "No verified recent opportunities right now — check back in a few days." (per §10.6).

### 4. Recommendations reliability (§9, §13.3, §13.4)
- Split generation into 4 independent server fns (already done for Opportunities; do the same for Careers, Learning, Role Models) so per-tab "Refresh" works and one failure doesn't kill the others.
- Learning card shows Title · Creator · Duration · Skill tag · Why. Role Models show Name · Field · Story · Why.

### 5. Growth Roadmap — full §12.3 output
Roadmap page today only shows milestone buckets. PRD requires the whole synthesized document.
- New server fn `generateFullRoadmap` that runs after ≥1 assessment is complete (warn if <9), calls a single "growth-roadmap" prompt with all `ai_results` + profile, and stores structured JSON.
- Migration: extend `roadmaps` with a `report jsonb` column (Overall Profile, Top Strengths, Areas to Improve, Career Recs, Skills to Learn, Learning Resources, Success Stories, 30-Day Plan, One-Year Roadmap, Motivation Summary).
- `roadmap.tsx` renders the report in ordered sections; milestones (30/90/180/365) stay under "Tracking" with checkboxes.
- Banner when <9 modules complete: "Report generated from partial data — complete the remaining N assessments for the full picture."

### 6. Power Statistics (§11)
- Update `power-statistics` prompt to force labeled estimates and cite a source per stat (UN/UNESCO/World Bank/ILO/ITU/WHO/Ethnologue).
- Migration: add `source`, `is_estimate` to `power_stats`.
- Stats page: each stat card shows big-number + comparison line + small "Estimate · source" footer. Confidence-building tone header (§11.2 quote).

### 7. Progress tracking (§12.3.11, §6.8)
- Career Compass retake: allow re-taking any assessment; new `ai_results` row per attempt, `results/$id` shows the latest.
- Dashboard "Growth Snapshot" strip pulls Career Readiness Score from the latest Career Compass result and Self-Awareness Score from the latest Self Identity result.

### 8. Housekeeping
- Remove console `inputValidator` deprecation warning by switching to `.validator()` in the 3 files that use it.
- Add `.env`-driven site title/description already; add per-route `head()` for Recommendations/Roadmap/Stats/Profile.
- Verify RLS + GRANTs for the new columns (columns inherit table policies, no new policies needed).

## Technical notes
- All new AI calls use `google/gemini-3-flash-preview` via the existing Lovable AI gateway helper; system prompts include the PRD's "never fabricate / honesty over fabrication" clause.
- All server fns keep `requireSupabaseAuth`; `ai_prompts` loaded via `supabaseAdmin` (existing pattern).
- Migrations run in order: profile fields → opportunities fields → roadmaps.report → power_stats source. All `GRANT` blocks re-issued per Lovable rules.
- No new external services, no new secrets.

## Out of scope (call out explicitly)
- Real live scraping of LinkedIn/Internshala (PRD §10.4) — the model returns best-effort recent listings; a real crawler is a separate project.
- Push/email notifications, SAML SSO, mobile app, screen-time integration, admin dashboard — all listed under §16 Future Features.

## Deliverables
- 4 migrations, ~6 edited server fn files, ~5 edited route files, 1 new onboarding route, updated DB prompts for `internship-opportunities`, `power-statistics`, and a new `growth-roadmap` prompt.
- Typecheck passes; one manual pass through: sign up → onboarding → complete 1 assessment → generate recs → generate opportunities → generate roadmap.
