# Admin Portal Plan

Because this is a large, multi-part feature, I'll build it in phases. Here's the proposed scope and approach — please confirm or adjust before I start.

## Phase 1 — Foundations (Auth + Access Control)

**Backend (Lovable Cloud / Supabase)**
- Enable Supabase email/password auth (already used by the app).
- Add a `admin_role` enum: `super_admin`, `admin`.
- Reuse existing `user_roles` table + `has_role()` RPC (already present).
- Seed the primary super admin `kallerenuka793@gmail.com` / `Renu@123` via a migration (creates the auth user with the service role and inserts a `super_admin` role row).
- Reuse existing `admin_requests` table (already present) — verify columns match: `email`, `full_name`, `reason`, `status`, `requested_at`, `reviewed_by`, `reviewed_at`.
- Add `admin_audit_logs` table: `id`, `actor_id`, `action` (login / login_failed / approve_request / reject_request / add_admin / remove_admin), `target`, `metadata`, `created_at`.
- RLS: only `super_admin`/`admin` can read admin tables; audit logs insert-only from server functions.

**Frontend**
- "Admin" link in top nav → `/admin/login`.
- `/admin/login` — email, password, Login, "Request Admin Access" (opens modal with email + name + reason).
- `/admin` (protected by `_authenticated` + role check) — dashboard shell with sub-tabs.

## Phase 2 — Requests Management

- `/admin/requests` — list of pending / approved / rejected requests.
- Approve → creates auth user (server fn using `supabaseAdmin`), assigns `admin` role, sends default password (or magic link), writes audit log.
- Reject → updates status + audit log.

## Phase 3 — Analytics Dashboard

Data sources: `guest_sessions`, `ai_results`, `future_letters`, `profiles`.

- **Overview cards**: total users, total analyses, new today/week/month, completion rate, avg completion time.
- **User table** with search + filters (age, age-group, interests, skills, goals, date, status).
- **Segmentation**: derive interest tags from stored answers + `pick` selections; group counts, %, avg age, top goals/skills.
- **Age analytics**: per-age (10–27) + bucketed (10–13, 14–16, 17–19, 20–22, 23–27) with top interests/goals.
- **Questionnaire analytics**: most-selected options, most-skipped, top "Other" text, top goals, top self-descriptions, top skills, top custom skills.
- **Charts**: use `recharts` (already common in shadcn stack) — pie, bar, line, trend.

## Phase 4 — Export

- CSV export (client-side, `papaparse` or native).
- PDF export (`jspdf` + `jspdf-autotable`) for the currently visible report.

## Phase 5 — Hardening

- Password hashing is handled by Supabase Auth (bcrypt) — nothing to store manually.
- Force password change on first login for accounts created via approval flow (flag `must_reset_password`).
- All privileged writes go through `createServerFn` + `requireSupabaseAuth` + explicit `has_role('admin')` check before loading `supabaseAdmin`.
- Audit-log every login (success/failure), approval, rejection, add/remove.

## Notes / Confirmations Needed

1. **Seeded password `Renu@123`** — this is weak and will be visible in the migration file. I'll seed it as requested and force a reset on first login. OK?
2. **Approval flow**: when an admin is approved, should the system (a) auto-create the auth account with a temp password emailed to them, or (b) require them to sign up separately after approval? I recommend (a).
3. **Scope**: shall I ship all 5 phases in one go, or start with Phases 1–2 (auth + requests) and follow up with 3–5 (analytics + export)? Given the size, I recommend shipping in two turns.

Reply "go" to proceed with all phases, or tell me which phase(s) to start with and any changes to the answers above.