# Reframe MyFlow — No-Auth Guided Journey

## New user flow (single-session, no login)

```text
/ (Intro)          → Name + Age form
/pick              → "What do you want to know about you?"
                     10 assessment checkboxes (multi-select)
/questions         → Renders questions ONLY for selected assessments,
                     stacked in one scrollable page with progress bar.
                     Final button: [ Analyze ]
/dashboard         → 5 segments:
                     1. Summary        2. Role Models
                     3. Roadmap        4. Opportunities
                     5. Suggested Podcasts
```

No sign-in / sign-up / Google / email anywhere. Session lives in `localStorage` (name, age, selected slugs, answers, generated results).

## Screens

**1. `/` Intro** — hero + a card with `Name` and `Age` inputs and a "Continue" button. Stores `{ name, age }` in localStorage, routes to `/pick`.

**2. `/pick` Feature picker** — heading "What do you want to know about you?"; grid of 10 checkboxes, one per assessment (pulled from `assessments` table). "Continue" enabled when ≥1 checked. Stores selected slugs.

**3. `/questions` Combined questionnaire** — loads all questions + options for the selected assessments in one page, grouped by module with a sticky progress indicator. Radio group per question. Bottom "Analyze" button; disabled until every question answered. On click: calls one new server fn `analyzeGuest` that runs each selected assessment's prompt + the recommendations/roadmap/stats prompts, returns a bundled result object, stored in localStorage under `myflow.result`.

**4. `/dashboard` 5-panel** — reads `myflow.result` from localStorage. Grid:
- **Summary** — top-line headline + 3-bullet insights synthesized across modules.
- **Role Models** — 3 cards (name, why they match).
- **Roadmap** — 4 milestones (30d / 3m / 6m / 1y), one line each.
- **Opportunities** — 3 cards (title, org, stipend, confidence).
- **Podcasts** — 3 cards (title, host, one-line pitch, link if any).

## Technical changes

### Routes
- Delete or bypass `/auth`, `/_authenticated/*` gating on the new user path. Keep the files, but remove nav links; add redirect from `/` to new flow.
- Add: `src/routes/index.tsx` (rewritten intro), `src/routes/pick.tsx`, `src/routes/questions.tsx`, `src/routes/dashboard.tsx` (public, reads localStorage).

### Server functions (public, no auth middleware)
- `src/lib/guest.functions.ts`:
  - `listAssessments()` → returns 10 assessments + categories.
  - `loadQuestions({ slugs })` → returns questions & options for chosen slugs.
  - `analyzeGuest({ name, age, answers, slugs })` → runs prompts via existing `runPrompt` / `loadPrompt`, returns `{ summary, roleModels, roadmap, opportunities, podcasts }`. No DB writes — pure compute. Uses `supabaseAdmin` only to read prompts/questions.

### Removed from client UX (kept in code but unlinked)
- Auth page, protected dashboard, per-assessment page, results detail page.

### State
- `localStorage['myflow.session']` = `{ name, age, slugs, answers, result }`.
- No profiles / user_responses / ai_results writes on the guest path.

### Landing metadata
- `head()` on `/`: title "MyFlow — Discover who you are", description matches new flow.

## Out of scope
- Persisting results server-side.
- Sharing / permalinks for dashboard (localStorage only).
- Editing the underlying prompt table.

Approve to build.
