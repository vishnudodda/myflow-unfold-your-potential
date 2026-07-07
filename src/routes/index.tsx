import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [skills, setSkills] = useState<Set<string>>(new Set());
  const [customSkill, setCustomSkill] = useState("");
  const [customEducation, setCustomEducation] = useState("");
  const [goal, setGoal] = useState("");
  const [oneLiner, setOneLiner] = useState("");

  const EDUCATION_OPTIONS = [
    { value: "in-school", label: "Currently in school" },
    { value: "in-college", label: "Currently in college / university" },
    { value: "graduated", label: "Graduated / passed out" },
    { value: "working", label: "Currently working a job" },
    { value: "job-hunting", label: "Looking for a job" },
    { value: "self-taught", label: "Self-taught / learning on my own" },
    { value: "other", label: "Other" },
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
  const AGE_OPTIONS = Array.from({ length: 27 - 10 + 1 }, (_, i) => 10 + i);

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
    const ageNum = parseInt(age, 10);
    if (!name.trim() || !ageNum || ageNum < 10 || ageNum > 27) return;
    if (!education) return;
    const finalEducation = education === "other" ? customEducation.trim() || "Other" : education;
    const finalSkills = Array.from(skills);
    const custom = customSkill.trim();
    if (skills.has("Other") && custom) finalSkills.push(custom);
    localStorage.setItem(
      "myflow.session",
      JSON.stringify({
        name: name.trim(),
        age: ageNum,
        education: finalEducation,
        skills: finalSkills,
        customSkill: custom || undefined,
        customEducation: education === "other" ? customEducation.trim() || undefined : undefined,
        goal: goal.trim() || undefined,
        oneLiner: oneLiner.trim() || undefined,
      }),
    );
    navigate({ to: "/pick" });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-lg py-12">
        <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>
        <h1 className="mt-8 font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
          The map to your <span className="font-serif italic font-normal text-primary">authentic</span> future.
        </h1>
        <p className="mt-4 text-muted-foreground">Tell us a little about you to begin.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Your age</Label>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger id="age">
                  <SelectValue placeholder="Pick your age" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {AGE_OPTIONS.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            {education === "other" && (
              <Input
                value={customEducation}
                onChange={(e) => setCustomEducation(e.target.value)}
                placeholder="Describe your current stage, e.g. gap year, freelancer, founder"
              />
            )}
            <p className="text-xs text-muted-foreground">Helps us match real opportunities to your stage.</p>
          </div>

          <div className="space-y-3">
            <div>
              <Label>Skills you already have</Label>
              <p className="text-xs text-muted-foreground mt-1">Pick any that feel true — even basic ones.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...SKILL_OPTIONS, "Other"].map((s) => {
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
            </div>
            {skills.has("Other") && (
              <Input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Type your skill(s), e.g. music production, chess"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">What is your current goal?</Label>
            <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Get into a great college, start a side project, land my first internship" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oneliner">Describe yourself in one line</Label>
            <Input id="oneliner" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="e.g. A curious builder who loves stories and startups" />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={!education}>Continue</Button>
        </form>
      </div>
    </main>
  );
}