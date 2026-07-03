import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — MyFlow" }] }),
  component: Dashboard,
});

type Category = { id: string; slug: string; name: string; tagline: string | null; sort_order: number };
type Assessment = { id: string; slug: string; title: string; category_id: string };
type UserAssessment = { assessment_id: string; status: string; progress: number };

function Dashboard() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [progress, setProgress] = useState<UserAssessment[]>([]);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const [{ data: prof }, { data: cats }, { data: asmts }, { data: prog }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("assessment_categories").select("*").order("sort_order"),
        supabase.from("assessments").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("user_assessments").select("assessment_id, status, progress").eq("user_id", userData.user.id),
      ]);
      setDisplayName(prof?.display_name || userData.user.email?.split("@")[0] || "friend");
      setCategories((cats ?? []) as Category[]);
      setAssessments((asmts ?? []) as Assessment[]);
      setProgress((prog ?? []) as UserAssessment[]);
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const done = progress.filter((p) => p.status === "completed").length;
  const pct = assessments.length ? Math.round((done / assessments.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/dashboard" className="text-foreground">Dashboard</Link>
            <Link to="/roadmap" className="hover:text-foreground">Roadmap</Link>
            <Link to="/recommendations" className="hover:text-foreground">Recommendations</Link>
            <Link to="/profile" className="hover:text-foreground">Profile</Link>
          </nav>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 space-y-12">
        <section>
          <span className="text-xs font-mono text-primary tracking-widest uppercase">Dashboard</span>
          <h1 className="mt-2 font-display text-4xl font-bold">Hello, {displayName}.</h1>
          <p className="mt-2 text-muted-foreground">You've completed {done} of {assessments.length} assessments ({pct}%).</p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold mb-6">The Nine Pillars</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border ring-1 ring-border">
            {categories.map((c, i) => {
              const a = assessments.find((x) => x.category_id === c.id);
              const p = progress.find((x) => x.assessment_id === a?.id);
              const status = p?.status ?? "not_started";
              return (
                <Link
                  key={c.id}
                  to="/assessments/$slug"
                  params={{ slug: a?.slug ?? "" }}
                  className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                      status === "completed" ? "bg-primary/10 text-primary" :
                      status === "in_progress" ? "bg-foreground/10 text-foreground" :
                      "text-muted-foreground"
                    }`}>
                      {status === "completed" ? "Done" : status === "in_progress" ? "In progress" : "Start"}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">{c.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.tagline}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}