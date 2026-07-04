import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/results/$id")({
  head: () => ({ meta: [{ title: "Your result — MyFlow" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const [result, setResult] = useState<{ output: Record<string, unknown>; created_at: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ai_results").select("output, created_at").eq("id", id).maybeSingle();
      if (data) setResult(data as { output: Record<string, unknown>; created_at: string });
    })();
  }, [id]);

  if (!result) return <div className="p-12 text-center text-muted-foreground">Loading your result…</div>;

  const o = result.output as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <span className="text-xs font-mono text-primary tracking-widest uppercase">AI Analysis</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-10">
        {typeof o.headline === "string" && (
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">{o.headline}</h1>
        )}
        {typeof o.summary === "string" && (
          <p className="text-lg text-muted-foreground leading-relaxed text-pretty">{o.summary}</p>
        )}
        {typeof o.personality_type === "string" && (
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Type</div>
            <div className="font-display text-2xl font-bold">{o.personality_type}</div>
          </div>
        )}
        {Array.isArray(o.strengths) && (
          <section>
            <h2 className="font-display text-xl font-bold mb-4">Strengths</h2>
            <ul className="space-y-2">
              {(o.strengths as string[]).map((s, i) => (
                <li key={i} className="p-4 rounded-xl border border-border bg-muted/30">{s}</li>
              ))}
            </ul>
          </section>
        )}
        {Array.isArray(o.growth_areas) && (
          <section>
            <h2 className="font-display text-xl font-bold mb-4">Growth areas</h2>
            <ul className="space-y-2">
              {(o.growth_areas as string[]).map((s, i) => (
                <li key={i} className="p-4 rounded-xl border border-border bg-muted/30">{s}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="pt-8 border-t border-border">
          <h2 className="font-display text-2xl font-bold">Next steps</h2>
          <p className="mt-2 text-sm text-muted-foreground">Turn this analysis into action.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link to="/recommendations" className="p-5 rounded-xl border border-border hover:border-primary/50 transition-colors">
              <p className="font-display font-bold">Recommendations →</p>
              <p className="mt-1 text-xs text-muted-foreground">Careers, learning, role models, opportunities.</p>
            </Link>
            <Link to="/roadmap" className="p-5 rounded-xl border border-border hover:border-primary/50 transition-colors">
              <p className="font-display font-bold">Growth Roadmap →</p>
              <p className="mt-1 text-xs text-muted-foreground">30 days · 3 · 6 · 12 month plan.</p>
            </Link>
            <Link to="/stats" className="p-5 rounded-xl border border-border hover:border-primary/50 transition-colors">
              <p className="font-display font-bold">Power Stats →</p>
              <p className="mt-1 text-xs text-muted-foreground">Benchmarked metrics about you.</p>
            </Link>
          </div>
          <Link to="/dashboard" className="mt-8 inline-block text-sm text-muted-foreground hover:text-foreground">← Back to dashboard</Link>
        </section>
      </main>
    </div>
  );
}