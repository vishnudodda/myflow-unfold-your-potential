import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyFlow — Discover who you are" },
      { name: "description", content: "Answer a few questions and get a personalized roadmap: role models, summary, roadmap, opportunities, and podcasts." },
    ],
  }),
  component: Intro,
});

function Intro() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(17);
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState<Set<string>>(new Set());
  const [otherSkillsText, setOtherSkillsText] = useState("");
  const [goal, setGoal] = useState("");
  const [selfDescription, setSelfDescription] = useState("");

  const EDUCATION_OPTIONS = [
    { value: "in-school", label: "Currently in school" },
    { value: "in-college", label: "Currently in college / university" },
    { value: "graduated", label: "Graduated / passed out" },
    { value: "working", label: "Currently working a job" },
    { value: "job-hunting", label: "Looking for a job" },
    { value: "self-taught", label: "Self-taught / learning on my own" },
  ];

  const SKILL_OPTIONS = [
    "Communication",
    "Socialization",
    "Leadership",
    "Teamwork",
    "Creativity",
    "Problem-solving",
    "Coding / Programming",
    "Digital / Tech",
    "Data analysis",
    "Design (UI/UX/Graphic)",
    "Writing",
    "Public speaking",
    "Languages",
    "Basic literacy & numeracy",
    "Physical / hands-on",
  ];

  function toggleSkill(s: string) {
    setSkills((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || age < 10 || age > 27) return;
    if (!education) return;
    if (!goal.trim() || !selfDescription.trim()) return;
    const customSkills = otherSkillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const allSkills = Array.from(skills).filter((s) => s !== "__other__");
    localStorage.setItem(
      "myflow.session",
      JSON.stringify({
        name: name.trim(),
        age,
        education,
        skills: [...allSkills, ...customSkills],
        customSkills,
        goal: goal.trim(),
        selfDescription: selfDescription.trim(),
      }),
    );
    navigate({ to: "/pick" });
  }

  const otherOn = skills.has("__other__");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-lg py-12">
        <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>
        <h1 className="mt-8 font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
          The map to your <span className="font-serif italic font-normal text-primary">authentic</span> future.
        </h1>
        <p className="mt-4 text-muted-foreground">Tell us a little about you to begin.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
          </div>

          <div className="space-y-2">
            <Label>Your age</Label>
            <AgeWheel value={age} onChange={setAge} />
            <p className="text-xs text-muted-foreground">Scroll to pick your age (10–27).</p>
          </div>

          <div className="space-y-2">
            <Label>Where are you right now?</Label>
            <Select value={education} onValueChange={setEducation}>
              <SelectTrigger>
                <SelectValue placeholder="Pick your current stage" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Helps us match real opportunities to your stage.</p>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Skills you already have</Label>
              <p className="text-xs text-muted-foreground mt-1">Pick any that feel true — even basic ones.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_OPTIONS.map((s) => {
                const on = skills.has(s);
                return (
                  <label
                    key={s}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                  >
                    <Checkbox checked={on} onCheckedChange={() => toggleSkill(s)} />
                    <span>{s}</span>
                  </label>
                );
              })}
              <label
                className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${otherOn ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
              >
                <Checkbox checked={otherOn} onCheckedChange={() => toggleSkill("__other__")} />
                <span>Other…</span>
              </label>
            </div>
            {otherOn && (
              <Input
                placeholder="Type your skills, separated by commas"
                value={otherSkillsText}
                onChange={(e) => setOtherSkillsText(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">What is your current goal?</Label>
            <Input id="goal" required value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Get into a top design college" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="self">Describe yourself in one line</Label>
            <Textarea id="self" required maxLength={140} value={selfDescription} onChange={(e) => setSelfDescription(e.target.value)} placeholder="e.g. Curious builder who loves music and math" />
            <p className="text-xs text-muted-foreground text-right">{selfDescription.length}/140</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!education || !name.trim() || !goal.trim() || !selfDescription.trim()}
          >
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}

function AgeWheel({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const ITEM_H = 44;
  const ages = Array.from({ length: 27 - 10 + 1 }, (_, i) => 10 + i);
  const ref = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = ages.indexOf(value);
    el.scrollTo({ top: idx * ITEM_H, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const idx = Math.round(el.scrollTop / ITEM_H);
      const next = ages[Math.max(0, Math.min(ages.length - 1, idx))];
      if (next !== value) onChange(next);
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }, 90);
  }

  return (
    <div className="relative rounded-xl border border-border bg-muted/30 overflow-hidden" style={{ height: ITEM_H * 3 }}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 bg-primary/10 border-y border-primary/30" />
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none"
        style={{ scrollPaddingTop: ITEM_H, paddingTop: ITEM_H, paddingBottom: ITEM_H }}
      >
        {ages.map((a) => (
          <div
            key={a}
            onClick={() => onChange(a)}
            className={`snap-center flex items-center justify-center cursor-pointer transition-all ${a === value ? "text-2xl font-bold text-primary" : "text-base text-muted-foreground"}`}
            style={{ height: ITEM_H }}
          >
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}