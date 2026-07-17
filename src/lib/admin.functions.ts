import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function anonClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function requireAdmin(ctxSupabase: any, userId: string) {
  const { data, error } = await ctxSupabase.rpc("is_admin", { _user_id: userId });
  if (error || !data) throw new Error("Forbidden: admin only");
}

async function audit(action: string, actor_id: string | null, actor_email: string | null, target: string | null, metadata: Record<string, unknown> = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_logs" as never).insert({ action, actor_id, actor_email, target, metadata } as never);
}

// ---------- Public: submit access request + record login attempts ----------

export const submitAdminRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().trim().email().max(255),
      full_name: z.string().trim().min(1).max(120),
      reason: z.string().trim().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await anonClient()
      .from("admin_requests" as never)
      .insert({ email: data.email, full_name: data.full_name, reason: data.reason ?? null, status: "pending" } as never);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const logAdminLoginAttempt = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().trim().email().max(255),
      success: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await audit(data.success ? "login" : "login_failed", null, data.email, data.email, {});
    return { ok: true };
  });

// ---------- Admin-only ----------

export type AdminOverview = {
  totalUsers: number;
  totalAnalyses: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  completionRate: number;
  avgCompletionMs: number;
};

export type AdminUserRow = {
  id: string;
  name: string;
  age: number | null;
  email: string | null;
  goal: string | null;
  skills: string[];
  interests: string[];
  completed: boolean;
  created_at: string;
  duration_ms: number | null;
  education: string | null;
  one_liner: string | null;
  custom_skill: string | null;
  answers: any;
};

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sessionsRaw } = await supabaseAdmin
      .from("guest_sessions" as never)
      .select("id,name,age,email,goal,skills,interests,completed,created_at,duration_ms,education,one_liner,custom_skill,answers")
      .order("created_at", { ascending: false })
      .limit(5000);
    const sessions = (sessionsRaw ?? []) as AdminUserRow[];

    const { count: analysesCount } = await supabaseAdmin
      .from("ai_results" as never)
      .select("id", { count: "exact", head: true });

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0,0,0,0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now); startOfMonth.setDate(now.getDate() - 30);

    let newToday = 0, newThisWeek = 0, newThisMonth = 0, completedCount = 0, durationSum = 0, durationN = 0;
    for (const s of sessions) {
      const t = new Date(s.created_at).getTime();
      if (t >= startOfDay.getTime()) newToday++;
      if (t >= startOfWeek.getTime()) newThisWeek++;
      if (t >= startOfMonth.getTime()) newThisMonth++;
      if (s.completed) {
        completedCount++;
        if (s.duration_ms && s.duration_ms > 0) { durationSum += s.duration_ms; durationN++; }
      }
    }

    const overview: AdminOverview = {
      totalUsers: sessions.length,
      totalAnalyses: analysesCount ?? 0,
      newToday, newThisWeek, newThisMonth,
      completionRate: sessions.length ? Math.round((completedCount / sessions.length) * 1000) / 10 : 0,
      avgCompletionMs: durationN ? Math.round(durationSum / durationN) : 0,
    };

    return { overview, users: sessions };
  });

export const listAdminRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("admin_requests" as never)
      .select("*")
      .order("created_at", { ascending: false });
    return { requests: (data ?? []) as any[] };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("admin_audit_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    return { logs: (data ?? []) as any[] };
  });

export const decideAdminRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: reqRow, error: rErr } = await supabaseAdmin
      .from("admin_requests" as never)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr || !reqRow) throw new Error("Request not found");
    const req = reqRow as any;
    if (req.status !== "pending") throw new Error("Request already decided");

    let tempPassword: string | null = null;
    if (data.decision === "approved") {
      // Create the auth user (if not exists) and assign admin role
      tempPassword = "Admin@" + Math.random().toString(36).slice(2, 10);
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: req.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: req.full_name ?? null, must_reset_password: true },
      });
      let userId = created?.user?.id ?? null;
      if (cErr && !userId) {
        // Likely already exists — look up
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        userId = existing?.users.find((u) => u.email?.toLowerCase() === req.email.toLowerCase())?.id ?? null;
        tempPassword = null;
      }
      if (!userId) throw new Error(cErr?.message || "Could not create admin user");
      await supabaseAdmin.from("user_roles" as never).insert({ user_id: userId, role: "admin" } as never);
    }

    await supabaseAdmin
      .from("admin_requests" as never)
      .update({ status: data.decision, reviewed_by: context.userId, reviewed_at: new Date().toISOString() } as never)
      .eq("id", data.id);

    await audit(
      data.decision === "approved" ? "approve_request" : "reject_request",
      context.userId,
      (context.claims as any)?.email ?? null,
      req.email,
      { request_id: data.id },
    );

    return { ok: true, tempPassword };
  });

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles" as never)
      .select("user_id, role, created_at")
      .in("role", ["admin", "super_admin"] as any);
    const rows = (roles ?? []) as any[];
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const emailById = new Map(users?.users.map((u) => [u.id, u.email ?? ""]) ?? []);
    return { admins: rows.map((r) => ({ user_id: r.user_id, role: r.role, created_at: r.created_at, email: emailById.get(r.user_id) ?? "" })) };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Do not allow removing a super_admin
    const { data: row } = await supabaseAdmin.from("user_roles" as never).select("role").eq("user_id", data.user_id).in("role", ["admin","super_admin"] as any).maybeSingle();
    if ((row as any)?.role === "super_admin") throw new Error("Cannot remove a Super Admin");
    await supabaseAdmin.from("user_roles" as never).delete().eq("user_id", data.user_id).eq("role", "admin");
    await audit("remove_admin", context.userId, (context.claims as any)?.email ?? null, data.user_id, {});
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin" as never, { _user_id: context.userId } as never);
    return { isAdmin: !!data };
  });