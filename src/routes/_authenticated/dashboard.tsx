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
  const [summary, setSummary] = useState<{ headline: string | null; body: string | null; resultId: string | null }>({ headline: null, body: null, resultId: null });
  const [counts, setCounts] = useState({ role_models: 0, opportunities: 0, podcasts: 0, milestones: 0, milestones_done: 0 });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const uid = userData.user.id;
      const [{ data: prof }, { data: cats }, { data: asmts }, { data: prog }, { data: latest }, { count: rmCount }, { count: opCount }, { count: pdCount }, { data: mils }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", userData.user.id).maybeSingle(),
        supabase.from("assessment_categories").select("*").order("sort_order"),
        supabase.from("assessments").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("user_assessments").select("assessment_id, status, progress").eq("user_id", uid),
        supabase.from("ai_results").select("id, output").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("role_models").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("learning_resources").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("kind", "podcast"),
        supabase.from("roadmap_milestones").select("id, completed_at").eq("user_id", uid),
      ]);
      setDisplayName(prof?.display_name || userData.user.email?.split("@")[0] || "friend");
      setCategories((cats ?? []) as Category[]);
      setAssessments((asmts ?? []) as Assessment[]);
      setProgress((prog ?? []) as UserAssessment[]);
      if (latest) {
        const o = (latest.output ?? {}) as Record<string, unknown>;
        setSummary({
          headline: typeof o.headline === "string" ? o.headline : typeof o.personality_type === "string" ? o.personality_type : null,
          body: typeof o.summary === "string" ? o.summary : null,
          resultId: latest.id as string,
        });
      }
      const mArr = (mils ?? []) as Array<{ completed_at: string | null }>;
      setCounts({
        role_models: rmCount ?? 0,
        opportunities: opCount ?? 0,
        podcasts: pdCount ?? 0,
        milestones: mArr.length,
        milestones_done: mArr.filter((m) => m.completed_at).length,
      });
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const done = progress.filter((p) => p.status === "completed").length;
  const pct = assessments.length ? Math.round((done / assessments.length) * 100) : 0;
  const showResults = done > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-xl font-bold tracking-tighter">MYFLOW</Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/dashboard" className="text-foreground">Dashboard</Link>
            <Link to="/roadmap" className="hover:text-foreground">Roadmap</Link>
            <Link to="/recommendations" className="hover:text-foreground">Recommendations</Link>
            <Link to="/stats" className="hover:text-foreground">Power Stats</Link>
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

        {showResults && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border ring-1 ring-border">
              {/* Summary */}
              <Link
                to={summary.resultId ? "/results/$id" : "/dashboard"}
                params={summary.resultId ? { id: summary.resultId } : undefined}
                className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col lg:col-span-2"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Summary</span>
                  <span className="text-xs font-mono text-muted-foreground">Latest analysis</span>
                </div>
                <h3 className="font-display text-2xl font-bold group-hover:text-primary transition-colors">
                  {summary.headline ?? "Your latest analysis"}
                </h3>
                {summary.body && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-4">{summary.body}</p>
                )}
                <span className="mt-4 text-xs font-semibold text-primary">Open full result →</span>
              </Link>

              {/* Role Models */}
              <Link to="/recommendations" className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Role Models</span>
                  <span className="text-xs font-mono text-muted-foreground">{counts.role_models}</span>
                </div>
                <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">People to learn from</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Curated role models matched to your traits and goals.</p>
                <span className="mt-auto pt-4 text-xs font-semibold text-primary">View role models →</span>
              </Link>

              {/* Roadmap */}
              <Link to="/roadmap" className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Roadmap</span>
                  <span className="text-xs font-mono text-muted-foreground">{counts.milestones_done}/{counts.milestones}</span>
                </div>
                <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">Growth Roadmap</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Your 30-day, 3-, 6-, and 12-month plan.</p>
                <span className="mt-auto pt-4 text-xs font-semibold text-primary">Open roadmap →</span>
              </Link>

              {/* Opportunities */}
              <Link to="/recommendations" className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Opportunities</span>
                  <span className="text-xs font-mono text-muted-foreground">{counts.opportunities}</span>
                </div>
                <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">Internships & programs</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Verified opportunities matched to your profile.</p>
                <span className="mt-auto pt-4 text-xs font-semibold text-primary">Browse opportunities →</span>
              </Link>

              {/* Podcasts */}
              <Link to="/recommendations" className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Podcasts</span>
                  <span className="text-xs font-mono text-muted-foreground">{counts.podcasts}</span>
                </div>
                <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">Listen & learn</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">Podcasts hand-picked from your learning recommendations.</p>
                <span className="mt-auto pt-4 text-xs font-semibold text-primary">Find podcasts →</span>
              </Link>
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-2xl font-bold mb-6">{showResults ? "Continue your assessments" : "Start with an assessment"}</h2>
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
            <Link
              to="/roadmap"
              className="bg-background p-8 hover:bg-muted transition-colors group flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-muted-foreground">10</span>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Roadmap
                </span>
              </div>
              <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">Growth Roadmap</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Your personalized 30-day, 3-month, 6-month, and 1-year plan — unlocked as you complete assessments.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}