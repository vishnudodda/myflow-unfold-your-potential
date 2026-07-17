import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapSuperAdmin, submitAdminRequest } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Login — MyFlow" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapSuperAdmin);
  const requestAccess = useServerFn(submitAdminRequest);
  const [mode, setMode] = useState<"login" | "request">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Idempotent seed of the primary super admin.
    bootstrap({}).catch(() => { /* silent */ });
  }, [bootstrap]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // Check admin role
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("No session");
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Unauthorized — this account is not an approved admin.");
      }
      toast.success("Welcome back, admin");
      navigate({ to: "/admin/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setBusy(false);
    }
  }

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestAccess({ data: { email: email.trim(), reason: reason.trim() || undefined } });
      toast.success("Request submitted. An admin will review it soon.");
      setMode("login");
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen text-foreground px-6 py-12">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <span className="text-[11px] font-mono uppercase tracking-widest bg-amber/10 text-amber px-3 py-1 rounded-full border border-amber/30">Admin</span>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-sm">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "login" ? "Admin Login" : "Request Admin Access"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Only approved administrators can access the dashboard." : "Submit a request. An existing admin will approve or reject it."}
          </p>
          {mode === "login" ? (
            <form onSubmit={onLogin} className="mt-6 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
                <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full rounded-full">
                {busy ? "Signing in…" : "Login"}
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => setMode("request")}>
                Request Admin Access
              </Button>
            </form>
          ) : (
            <form onSubmit={onRequest} className="mt-6 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Why do you need admin access? (optional)</label>
                <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy} className="w-full rounded-full">
                {busy ? "Sending…" : "Submit request"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
                Back to login
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}