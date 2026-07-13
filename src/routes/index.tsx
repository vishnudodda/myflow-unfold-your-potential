import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);

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

  const trimmedName = name.trim();
  const nameValid = /^[A-Za-z][A-Za-z\s'-]*$/.test(trimmedName);
  const ageNum = parseInt(age, 10);
  const ageValid = !!ageNum && ageNum >= 10 && ageNum <= 27;
  const educationValid = !!education && (education !== "other" || customEducation.trim().length > 0);
  const nonOtherSkills = Array.from(skills).filter((s) => s !== "Other");
  const skillsValid = nonOtherSkills.length > 0 || (skills.has("Other") && customSkill.trim().length > 0);
  const goalValid = goal.trim().length > 0;
  const oneLinerValid = oneLiner.trim().length > 0;
  const formValid = nameValid && ageValid && educationValid && skillsValid && goalValid && oneLinerValid;

  const steps = useMemo(() => [
    { key: "name", valid: nameValid, label: "Your name" },
    { key: "age", valid: ageValid, label: "Your age" },
    { key: "education", valid: educationValid, label: "Where you are" },
    { key: "skills", valid: skillsValid, label: "Your skills" },
    { key: "goal", valid: goalValid, label: "Your goal" },
    { key: "oneLiner", valid: oneLinerValid, label: "One line about you" },
  ], [nameValid, ageValid, educationValid, skillsValid, goalValid, oneLinerValid]);
  const isLast = step === steps.length - 1;
  const currentValid = steps[step].valid;

  function goNext() {
    setTouched(true);
    if (!currentValid) return;
    setTouched(false);
    if (!isLast) setStep((s) => s + 1);
    else submit();
  }

  function submit() {
    if (!formValid) return;
    const finalEducation = education === "other" ? customEducation.trim() || "Other" : education;
    const finalSkills = Array.from(skills);
    const custom = customSkill.trim();
    if (skills.has("Other") && custom) finalSkills.push(custom);
    localStorage.setItem(
      "myflow.session",
      JSON.stringify({
        name: trimmedName,
        age: ageNum,
        education: finalEducation,
        skills: finalSkills,
        customSkill: custom || undefined,
        customEducation: education === "other" ? customEducation.trim() || undefined : undefined,
        goal: goal.trim(),
        oneLiner: oneLiner.trim(),
      }),
    );
    navigate({ to: "/pick" });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pastel-lilac via-pastel-blue to-pastel-mint text-foreground px-6">
      <div className="w-full max-w-lg py-12">
        <span className="font-display text-xl font-bold tracking-tighter text-primary">MYFLOW</span>
        <h1 className="mt-6 font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
          The map to your <span className="font-serif italic font-normal text-primary">authentic</span> future.
        </h1>

        {/* Progress dots */}
        <div className="mt-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? "bg-primary" : i === step ? "bg-primary/70" : "bg-white/60"}`}
            />
          ))}
        </div>
        <p className="mt-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Question {step + 1} of {steps.length}
        </p>

        <div key={step} className="mt-8 rounded-3xl bg-white/80 backdrop-blur border border-white/60 shadow-[0_20px_60px_-30px_rgba(80,60,180,0.35)] p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {step === 0 && (
            <div className="space-y-3">
              <Label htmlFor="name" className="font-display text-xl">What's your name?</Label>
              <Input
                id="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s'-]/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                placeholder="e.g. Aarav"
                className="text-lg"
              />
              {touched && !nameValid && <p className="text-xs text-destructive">Letters only, please.</p>}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <Label className="font-display text-xl">How old are you, {trimmedName || "friend"}?</Label>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger className="text-lg h-12"><SelectValue placeholder="Pick your age" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {AGE_OPTIONS.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
              {touched && !ageValid && <p className="text-xs text-destructive">Please pick your age.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Label className="font-display text-xl">Where are you right now?</Label>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger className="text-lg h-12"><SelectValue placeholder="Pick your current stage" /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                </SelectContent>
              </Select>
              {education === "other" && (
                <Input value={customEducation} onChange={(e) => setCustomEducation(e.target.value)} placeholder="Describe your current stage" />
              )}
              {touched && !educationValid && <p className="text-xs text-destructive">Please tell us where you are.</p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Label className="font-display text-xl">Which skills feel true for you?</Label>
              <p className="text-xs text-muted-foreground">Pick any — even basic ones.</p>
              <div className="grid grid-cols-2 gap-2">
                {[...SKILL_OPTIONS, "Other"].map((s) => {
                  const on = skills.has(s);
                  return (
                    <label key={s} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer transition-colors ${on ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                      <Checkbox checked={on} onCheckedChange={() => toggleSkill(s)} />
                      <span>{s}</span>
                    </label>
                  );
                })}
              </div>
              {skills.has("Other") && (
                <Input value={customSkill} onChange={(e) => setCustomSkill(e.target.value)} placeholder="Type your skill(s)" />
              )}
              {touched && !skillsValid && <p className="text-xs text-destructive">Pick at least one skill.</p>}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <Label htmlFor="goal" className="font-display text-xl">What's your current goal?</Label>
              <Input id="goal" autoFocus value={goal} onChange={(e) => setGoal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goNext(); }} placeholder="e.g. Land my first internship" className="text-lg" />
              {touched && !goalValid && <p className="text-xs text-destructive">Share a goal, big or small.</p>}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <Label htmlFor="oneliner" className="font-display text-xl">Describe yourself in one line.</Label>
              <Input id="oneliner" autoFocus value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") goNext(); }} placeholder="e.g. A curious builder who loves stories" className="text-lg" />
              {touched && !oneLinerValid && <p className="text-xs text-destructive">A line about you helps us personalise things.</p>}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => { setTouched(false); setStep((s) => Math.max(0, s - 1)); }}>← Back</Button>
            <Button type="button" size="lg" onClick={goNext}>{isLast ? "Continue ✧" : "Next →"}</Button>
          </div>
        </div>
      </div>
    </main>
  );
}