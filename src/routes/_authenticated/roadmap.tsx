import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { generateRoadmap, getRoadmap, toggleMilestone } from "@/lib/roadmap.functions";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Growth Roadmap — MyFlow" },
      { name: "description", content: "A personalized 30-day, 3-month, 6-month, and 1-year plan generated from your assessments." },
    ],
  }),
  component: RoadmapPage,
});

type Milestone = { id: string; title: string; description: string | null; horizon: string; completed_at: string | null };
type Roadmap = { id: string; title: string; summary: string | null; target_career: string | null; created_at: string };

const HORIZONS: { key: string; label: string }[] = [
  { key: "30_day", label: "Next 30 days" },
  { key: "3_month", label: "3 months" },
  { key: "6_month", label: "6 months" },
  { key: "1_year", label: "1 year" },
];

function RoadmapPage() {
  const get = useServerFn(getRoadmap);
  const gen = useServerFn(generateRoadmap);
  const toggle = useServerFn(toggleMilestone);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const r = (await get()) as { roadmap: Roadmap | null; milestones: Milestone[] };
      setRoadmap(r.roadmap);
      setMilestones(r.milestones);
    } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function generate() {
    setGenerating(true);
    try {
      toast.info("Building your roadmap with AI…");
      await gen();
      toast.success("Roadmap ready");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  }

  async function onToggle(m: Milestone) {
    const completed = !m.completed_at;
    setMilestones((prev) => prev.map((x) => x.id === m.id ? { ...x, completed_at: completed ? new Date().toISOString() : null } : x));
    try { await toggle({ data: { id: m.id, completed } }); } catch { refresh(); }
  }

  const done = milestones.filter((m) => m.completed_at).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
          {roadmap && <Button onClick={generate} disabled={generating} variant="outline" size="sm">{generating ? "Regenerating…" : "Regenerate"}</Button>}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <span className="text-xs font-mono text-primary tracking-widest uppercase">Growth Roadmap</span>

        {loading ? (
          <p className="mt-8 text-muted-foreground">Loading…</p>
        ) : !roadmap ? (
          <div className="mt-8">
            <h1 className="font-display text-4xl font-bold">Your growth roadmap</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl">A personalized plan across 30 days, 3 months, 6 months, and 1 year — built from your assessment results.</p>
            <div className="mt-8 p-12 rounded-2xl border border-dashed border-border text-center">
              <p className="font-display text-xl font-bold">No roadmap yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Complete at least one assessment, then generate.</p>
              <Button className="mt-6" onClick={generate} disabled={generating}>{generating ? "Generating…" : "Generate my roadmap"}</Button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-2 font-display text-4xl font-bold">{roadmap.title}</h1>
            {roadmap.target_career && <p className="mt-2 text-sm text-muted-foreground">Target: <span className="text-foreground font-medium">{roadmap.target_career}</span></p>}
            {roadmap.summary && <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">{roadmap.summary}</p>}
            <p className="mt-4 text-xs font-mono text-muted-foreground">{done} of {milestones.length} milestones complete</p>

            <div className="mt-12 space-y-12">
              {HORIZONS.map((h) => {
                const items = milestones.filter((m) => m.horizon === h.key);
                if (items.length === 0) return null;
                return (
                  <section key={h.key}>
                    <div className="flex items-baseline justify-between border-b border-border pb-3">
                      <h2 className="font-display text-2xl font-bold">{h.label}</h2>
                      <span className="text-xs font-mono text-muted-foreground">{items.filter((i) => i.completed_at).length} / {items.length}</span>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {items.map((m) => (
                        <li key={m.id} className="flex gap-3 p-4 rounded-xl border border-border">
                          <Checkbox checked={!!m.completed_at} onCheckedChange={() => onToggle(m)} className="mt-1" />
                          <div className="flex-1">
                            <p className={`font-medium ${m.completed_at ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                            {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}