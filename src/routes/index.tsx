import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState(0);

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

  const steps = useMemo(
    () => [
      { key: "name", label: "What's your name?", valid: nameValid },
      { key: "age", label: "How old are you?", valid: ageValid },
      { key: "education", label: "Where are you right now?", valid: educationValid },
      { key: "skills", label: "Which skills do you already have?", valid: skillsValid },
      { key: "goal", label: "What's your current goal?", valid: goalValid },
      { key: "oneLiner", label: "Describe yourself in one line.", valid: oneLinerValid },
    ],
    [nameValid, ageValid, educationValid, skillsValid, goalValid, oneLinerValid],
  );

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function finish() {
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

  function next() {
    setTouched(true);
    if (!current.valid) return;
    setTouched(false);
    if (isLast) {
      if (formValid) finish();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setTouched(false);
    setStep((s) => Math.max(0, s - 1));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    next();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-lg py-12">
        <span className="font-display text-xl font-bold tracking-tighter">MYFLOW</span>
        <div className="mt-8 flex items-center gap-2">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground uppercase tracking-widest">
          Question {step + 1} of {steps.length}
        </p>
        <h1 className="mt-3 font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
          {current.key === "name" && <>What's your <span className="font-serif italic font-normal text-primary">name</span>?</>}
          {current.key === "age" && <>How <span className="font-serif italic font-normal text-primary">old</span> are you?</>}
          {current.key === "education" && <>Where are you <span className="font-serif italic font-normal text-primary">right now</span>?</>}
          {current.key === "skills" && <>Which <span className="font-serif italic font-normal text-primary">skills</span> do you already have?</>}
          {current.key === "goal" && <>What's your current <span className="font-serif italic font-normal text-primary">goal</span>?</>}
          {current.key === "oneLiner" && <>Describe <span className="font-serif italic font-normal text-primary">yourself</span> in one line.</>}
        </h1>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          {current.key === "name" && (
            <div className="space-y-2">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s'-]/g, ""))}
                placeholder="e.g. Alex"
              />
              {touched && !nameValid && <p className="text-xs text-destructive">Letters only, please.</p>}
            </div>
          )}

          {current.key === "age" && (
            <div className="space-y-2">
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger><SelectValue placeholder="Pick your age" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {AGE_OPTIONS.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched && !ageValid && <p className="text-xs text-destructive">Please pick your age.</p>}
            </div>
          )}

          {current.key === "education" && (
            <div className="space-y-2">
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger><SelectValue placeholder="Pick your current stage" /></SelectTrigger>
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
              {touched && !educationValid && <p className="text-xs text-destructive">Please tell us where you are.</p>}
              <p className="text-xs text-muted-foreground">Helps us match real opportunities to your stage.</p>
            </div>
          )}

          {current.key === "skills" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Pick any that feel true — even basic ones.</p>
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
              {touched && !skillsValid && <p className="text-xs text-destructive">Pick at least one skill.</p>}
            </div>
          )}

          {current.key === "goal" && (
            <div className="space-y-2">
              <Input
                autoFocus
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Get into a great college, start a side project, land my first internship"
              />
              {touched && !goalValid && <p className="text-xs text-destructive">Share a goal, big or small.</p>}
            </div>
          )}

          {current.key === "oneLiner" && (
            <div className="space-y-2">
              <Input
                autoFocus
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="e.g. A curious builder who loves stories and startups"
              />
              {touched && !oneLinerValid && <p className="text-xs text-destructive">A line about you helps us personalise things.</p>}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
            <Button type="submit" size="lg" className="min-w-32">
              {isLast ? "Continue" : "Next"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}