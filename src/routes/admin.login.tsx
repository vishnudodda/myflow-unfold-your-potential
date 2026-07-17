import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logAdminLoginAttempt, submitAdminRequest, checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin Login — MyFlow" }, { name: "robots", content: "noindex" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const logAttempt = useServerFn(logAdminLoginAttempt);
  const submitReq = useServerFn(submitAdminRequest);
  const checkAdmin = useServerFn(checkIsAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqDone, setReqDone] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const { error: sErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (sErr) {
        await logAttempt({ data: { email: email.trim(), success: false } });
        setError("Invalid credentials");
        return;
      }
      const { isAdmin } = await checkAdmin();
      if (!isAdmin) {
        await supabase.auth.signOut();
        await logAttempt({ data: { email: email.trim(), success: false } });
        setError("Unauthorized: this account is not an admin.");
        return;
      }
      await logAttempt({ data: { email: email.trim(), success: true } });
      navigate({ to: "/admin" });
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally { setBusy(false); }
  }

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await submitReq({ data: { email: reqEmail.trim(), full_name: reqName.trim(), reason: reqReason.trim() || undefined } });
      if (!res.ok) { setError(res.error ?? "Could not submit request"); return; }
      setReqDone("Request submitted. An existing admin will review it soon.");
      setReqName(""); setReqEmail(""); setReqReason("");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 text-foreground">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="font-display text-xl font-bold tracking-tighter"><span className="text-amber">MYFLOW</span> ✦</Link>
          <span className="text-[11px] font-mono uppercase tracking-widest text-foreground/60">Admin</span>
        </div>

        <div className="rounded-3xl bg-card/90 backdrop-blur border border-amber/30 shadow-[0_20px_60px_-25px_rgba(255,209,0,0.35)] p-6 md:p-8">
          {!showRequest ? (
            <>
              <h1 className="font-display text-3xl font-bold tracking-tight">Admin sign in</h1>
              <p className="mt-2 text-sm text-muted-foreground">Only approved administrators can access the portal.</p>
              <form onSubmit={onLogin} className="mt-6 space-y-3">
                <Input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-background/60 border-amber/30" />
                <Input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-background/60 border-amber/30" />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy} className="w-full h-12 rounded-full">{busy ? "Signing in…" : "Login"}</Button>
              </form>
              <button onClick={() => { setShowRequest(true); setError(null); }} className="mt-4 w-full text-sm text-amber hover:underline">Request Admin Access →</button>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight">Request Admin Access</h1>
              <p className="mt-2 text-sm text-muted-foreground">An existing admin will review your request.</p>
              {reqDone ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-emerald-500">{reqDone}</p>
                  <Button variant="outline" onClick={() => { setShowRequest(false); setReqDone(null); }} className="w-full">Back to sign in</Button>
                </div>
              ) : (
                <form onSubmit={onRequest} className="mt-6 space-y-3">
                  <Input required placeholder="Full name" value={reqName} onChange={(e) => setReqName(e.target.value)} className="h-12 bg-background/60 border-amber/30" />
                  <Input required type="email" placeholder="Email address" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} className="h-12 bg-background/60 border-amber/30" />
                  <Textarea placeholder="Why do you need admin access? (optional)" value={reqReason} onChange={(e) => setReqReason(e.target.value)} className="min-h-24 bg-background/60 border-amber/30" />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowRequest(false)} className="flex-1">Cancel</Button>
                    <Button type="submit" disabled={busy} className="flex-1 rounded-full">{busy ? "Submitting…" : "Submit request"}</Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}