import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPER_ADMIN_EMAIL = "kallerenuka793@gmail.com";
const SUPER_ADMIN_INITIAL_PASSWORD = "Renu@123";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// Idempotently ensures the seeded super admin exists. Called by /admin/login on mount.
export const bootstrapSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();
  // Find user by email
  const { data: list, error: listErr } = await db.auth.admin.listUsers();
  if (listErr) throw new Error(listErr.message);
  let user = list.users.find((u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL);
  if (!user) {
    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_INITIAL_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Primary Super Admin" },
    });
    if (createErr) throw new Error(createErr.message);
    user = created.user ?? undefined;
  }
  if (!user) throw new Error("Could not create super admin");
  await db
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  return { ok: true };
});

export const submitAdminRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        reason: z.string().trim().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("admin_requests").insert({
      email: data.email,
      reason: data.reason ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AdminOverview = {
  totalSessions: number;
  today: number;
  week: number;
  month: number;
  avgAge: number | null;
  users: Array<{
    id: string;
    name: string;
    age: number | null;
    email: string | null;
    education: string | null;
    goal: string | null;
    skills: string[];
    interests: string[];
    completed: boolean;
    created_at: string;
  }>;
  byInterest: Array<{ interest: string; count: number }>;
  bySkill: Array<{ skill: string; count: number }>;
  byAgeBucket: Array<{ bucket: string; count: number }>;
  pendingRequests: Array<{ id: string; email: string; reason: string | null; created_at: string }>;
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context.userId);
    const db = await admin();
    const { data: sessions, error } = await db
      .from("guest_sessions")
      .select("id, name, age, email, education, goal, skills, interests, completed, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const rows = sessions ?? [];
    let ageSum = 0, ageCount = 0;
    const interestMap = new Map<string, number>();
    const skillMap = new Map<string, number>();
    const buckets: Record<string, number> = { "10-13": 0, "14-16": 0, "17-19": 0, "20-22": 0, "23-27": 0, "28+": 0 };
    for (const r of rows) {
      if (typeof r.age === "number") { ageSum += r.age; ageCount++; }
      for (const i of (r.interests ?? [])) interestMap.set(i, (interestMap.get(i) ?? 0) + 1);
      for (const s of (r.skills ?? [])) skillMap.set(s, (skillMap.get(s) ?? 0) + 1);
      const a = r.age ?? 0;
      if (a >= 10 && a <= 13) buckets["10-13"]++;
      else if (a <= 16) buckets["14-16"]++;
      else if (a <= 19) buckets["17-19"]++;
      else if (a <= 22) buckets["20-22"]++;
      else if (a <= 27) buckets["23-27"]++;
      else if (a >= 28) buckets["28+"]++;
    }
    const today = rows.filter((r) => new Date(r.created_at) >= startOfDay).length;
    const week = rows.filter((r) => new Date(r.created_at) >= weekAgo).length;
    const month = rows.filter((r) => new Date(r.created_at) >= monthAgo).length;

    const { data: reqs } = await db
      .from("admin_requests")
      .select("id, email, reason, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    return {
      totalSessions: rows.length,
      today, week, month,
      avgAge: ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : null,
      users: rows.map((r) => ({
        id: r.id,
        name: r.name,
        age: r.age,
        email: r.email,
        education: r.education,
        goal: r.goal,
        skills: r.skills ?? [],
        interests: r.interests ?? [],
        completed: r.completed,
        created_at: r.created_at,
      })),
      byInterest: Array.from(interestMap.entries())
        .map(([interest, count]) => ({ interest, count }))
        .sort((a, b) => b.count - a.count),
      bySkill: Array.from(skillMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      byAgeBucket: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })),
      pendingRequests: (reqs ?? []).map((r) => ({
        id: r.id, email: r.email, reason: r.reason, created_at: r.created_at,
      })),
    };
  });

export const decideAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), decision: z.enum(["approved", "rejected"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = await admin();
    const { data: req, error: rErr } = await db
      .from("admin_requests")
      .select("id, email, status")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Already reviewed");

    // Update the request row.
    const { error: uErr } = await db
      .from("admin_requests")
      .update({
        status: data.decision,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    // If approved, ensure the user has an auth account + admin role.
    // If no account exists we create one with a temporary random password
    // and issue a recovery link so they can set their own.
    let inviteLink: string | null = null;
    if (data.decision === "approved") {
      const { data: list } = await db.auth.admin.listUsers();
      let user = list?.users.find((u) => u.email?.toLowerCase() === req.email.toLowerCase());
      if (!user) {
        const tmp = crypto.randomUUID() + "!Aa1";
        const { data: created, error: cErr } = await db.auth.admin.createUser({
          email: req.email,
          password: tmp,
          email_confirm: true,
        });
        if (cErr) throw new Error(cErr.message);
        user = created.user ?? undefined;
      }
      if (user) {
        await db.from("user_roles").upsert(
          { user_id: user.id, role: "admin" },
          { onConflict: "user_id,role" },
        );
        const { data: link } = await db.auth.admin.generateLink({
          type: "recovery",
          email: req.email,
        });
        inviteLink = link?.properties?.action_link ?? null;
      }
    }
    return { ok: true, inviteLink };
  });