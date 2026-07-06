# MyFlow — Personalization & Report Upgrade

Six focused upgrades across intake, questionnaire, analysis, and report export.

## 1. Intro page (`src/routes/index.tsx`)

- **Age picker** — replace number input with a scrollable wheel picker (custom snap-scroll list), range **10–27**, single value, defaulting to 17.
- **Skills** — keep the current 15 chips; add an **"Other"** chip; when active, reveal a text input for a comma-separated custom skill list. Custom skills are merged into `skills` on submit.
- Add two new text questions stored in `myflow.session`:
  - `goal` — "What is your current goal?" (single-line text, required)
  - `selfDescription` — "Describe yourself in one line." (single-line text, required, max 140 chars)
- Session shape becomes: `{ name, age, education, skills, customSkills, goal, selfDescription }`.

## 2. Questionnaire (`src/routes/questions.tsx` + `src/lib/guest.functions.ts`)

- Each question renders its 4 original options plus a **5th "Other"** option; selecting it reveals a text input whose value becomes the answer (`Other: <text>`).
- Add a **Skip** button on every question. Skipped questions record `{ skipped: true }` and are excluded from the "must answer all" gate.
- **Analyze** button is enabled as long as at least one question in each selected module has an answer OR the user has skipped through — never blocked.
- Auto-save answers to `localStorage` on every change (already partially done) so refresh preserves state.
- Extend `analyzeGuest` input to accept `goal`, `selfDescription`, `customSkills`, and `answers[].skipped`.

## 3. Analysis engine (`src/lib/guest.functions.ts`)

Rewrite `SYSTEM_PROMPT` + user message assembly to:
- Include age, education stage, declared + custom skills, goal, one-line self-description, module list, and every answer (skipped ones sent as `SKIPPED`).
- Instruct the model to weigh every signal and explicitly reason across skipped gaps rather than fabricating.
- Extend the output schema with:
  - `summary.strengths[3]`, `summary.growthAreas[3]`, `summary.personalityPattern`, `summary.learningStyle`, `summary.blindSpots[2]`, `summary.motivation`, `summary.careerInsights[3]`, `summary.conclusion`.
- Keep the existing `roleModels`, `roadmap`, `opportunities`, `podcasts`, `perspective` sections but pass age explicitly and instruct role-model selection to be age-appropriate (young achievers <18, student founders / creators 18–22, early-career mentors 23–27).

## 4. Dashboard (`src/routes/dashboard.tsx`)

- Render the new fields: Strengths, Growth Areas, Personality Pattern, Learning Style, Blind Spots, Career Insights, Conclusion.
- Add a **Download Report** button in the dashboard header that calls a new server fn `generateReport` and triggers a browser download.

## 5. Downloadable PDF report

- New server fn `generateReport` in `src/lib/guest.functions.ts` (or a sibling `report.functions.ts`) that accepts `{ session, answers, result }` and returns `{ pdfBase64, filename }`.
- Uses `pdf-lib` (pure-JS, Worker-compatible) to build a clean multi-page PDF with sections:
  1. Cover — name, age, generated date
  2. Profile — age, education, skills, custom skills, goal, one-line self-description
  3. Questionnaire responses — grouped by module, skipped answers clearly labeled `[Skipped]`, Other responses shown verbatim
  4. Personality analysis — summary, personality pattern, learning style
  5. Strengths & Growth areas
  6. Career insights & Opportunities
  7. Recommended role models (with why)
  8. Roadmap
  9. Personalized conclusion
- Client decodes the base64 and triggers a `Blob` download as `myflow-report-<name>.pdf`.

## 6. UX polish

- Wheel picker, chip transitions, Other-textbox reveal all use existing Tailwind tokens — no new colors.
- Smooth scroll to the next question after answer/skip.
- Persist `myflow.session` and `myflow.answers` on every change; hydrate on mount.
- Keep the existing design system (Playfair serif italic accents, primary color, muted foreground) — no restyle beyond the new elements.

## Technical notes

- **Dependency added:** `pdf-lib` (pure JS, safe in the Worker runtime).
- No DB schema changes — everything stays in `localStorage` and one server fn call.
- `analyzeGuest` schema (`AnalyzeSchema`) and `DashboardResult` type both extended; dashboard renderer updated to match.
- Wheel picker built inline (scroll-snap CSS) — no new dependency.
- No changes to auth, RLS, or existing migrations.

Approve to build.