import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAssessments } from "@/lib/guest.functions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/pick")({
  ssr: false,
  head: () => ({ meta: [{ title: "What do you want to know about you? — MyFlow" }] }),
  component: Pick,
});

function Pick() {
  const navigate = useNavigate();
  const listFn = useServerFn(listAssessments);
  const { data } = useQuery({ queryKey: ["assessments"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const raw = localStorage.getItem("myflow.session");
    if (!raw) { navigate({ to: "/" }); return; }
    try { setName((JSON.parse(raw) as { name: string }).name); } catch { navigate({ to: "/" }); }
  }, [navigate]);

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function onContinue() {
    if (selected.size === 0) return;
    const raw = localStorage.getItem("myflow.session");
    const sess = raw ? JSON.parse(raw) : {};
    localStorage.setItem("myflow.session", JSON.stringify({ ...sess, slugs: Array.from(selected) }));
    navigate({ to: "/questions" });
  }

  return (
    <main className="min-h-screen text-foreground px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>
        <h1 className="mt-8 font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
          {name ? `Hey ${name}, ` : ""}what do you want to know about you?
        </h1>
        <p className="mt-3 text-muted-foreground">Pick any that resonate. You can choose more than one.</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(data?.assessments ?? []).map((a) => {
            const on = selected.has(a.slug);
            return (
              <label
                key={a.slug}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <Checkbox checked={on} onCheckedChange={() => toggle(a.slug)} className="mt-0.5" />
                <div>
                  <div className="font-display font-semibold">{a.title}</div>
                  {a.description ? <div className="text-sm text-muted-foreground mt-0.5">{a.description}</div> : null}
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-8 sticky bottom-4 flex justify-end">
          <Button size="lg" disabled={selected.size === 0} onClick={onContinue}>
            Continue ({selected.size})
          </Button>
        </div>
      </div>
    </main>
  );
}