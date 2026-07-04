import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generatePowerStats, getPowerStats } from "@/lib/stats.functions";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Power Statistics — MyFlow" },
      { name: "description", content: "Personal benchmark statistics generated from your assessment results." },
    ],
  }),
  component: StatsPage,
});

type Stat = { id: string; label: string; value: string; benchmark: string | null; narrative: string | null; source: string | null; is_estimate: boolean | null };

function StatsPage() {
  const get = useServerFn(getPowerStats);
  const gen = useServerFn(generatePowerStats);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<Stat[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const r = (await get()) as { stats: Stat[] };
      setStats(r.stats);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      toast.info("Crunching your stats with AI…");
      await gen();
      toast.success("Stats ready");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <Button onClick={generate} disabled={generating} size="sm" variant={stats.length ? "outline" : "default"}>
            {generating ? "Generating…" : stats.length ? "Regenerate" : "Generate"}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <span className="text-xs font-mono text-primary tracking-widest uppercase">Power Statistics</span>
        <h1 className="mt-2 font-display text-4xl font-bold">You've come further than you think.</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl">You already have opportunities that many don't. Now imagine what you can achieve if you keep growing.</p>

        {loading ? (
          <p className="mt-12 text-muted-foreground">Loading…</p>
        ) : stats.length === 0 ? (
          <div className="mt-12 p-12 rounded-2xl border border-dashed border-border text-center">
            <p className="font-display text-xl font-bold">No stats yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Complete at least one assessment, then generate.</p>
            <Button className="mt-6" onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate now"}</Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-px bg-border ring-1 ring-border grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <article key={s.id} className="bg-background p-8">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className="mt-3 font-display text-4xl font-bold text-primary">{s.value}</p>
                {s.benchmark && <p className="mt-2 text-xs text-muted-foreground">{s.benchmark}</p>}
                {s.narrative && <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{s.narrative}</p>}
                {(s.source || s.is_estimate) && (
                  <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    {s.is_estimate ? "Estimate" : "Verified"}{s.source ? ` · ${s.source}` : ""}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}