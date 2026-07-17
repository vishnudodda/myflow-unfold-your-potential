import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [error, setError] = useState<string | null>(null);

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

  const stepsMeta = [
    { key: "name", label: "First, what's your name?", helper: "We'll use this to make things personal.", valid: nameValid, errorMsg: "Letters only, please." },
    { key: "age", label: "How old are you?", helper: "Pick the number that fits you today.", valid: ageValid, errorMsg: "Please pick your age." },
    { key: "education", label: "Where are you right now in life?", helper: "Helps us match real opportunities to your stage.", valid: educationValid, errorMsg: "Please tell us where you are." },
    { key: "skills", label: "Which skills already feel true for you?", helper: "Pick any that fit — even the basic ones count.", valid: skillsValid, errorMsg: "Pick at least one skill." },
    { key: "goal", label: "What's your current goal?", helper: "Big or small — just say what's on your mind.", valid: goalValid, errorMsg: "Share a goal, big or small." },
    { key: "oneLiner", label: "Describe yourself in one line.", helper: "One honest line about you helps us personalise things.", valid: oneLinerValid, errorMsg: "Give us one line about you." },
  ] as const;

  const total = stepsMeta.length;
  const current = stepsMeta[step];

  function goNext() {
    if (!current.valid) { setError(current.errorMsg); return; }
    setError(null);
    if (step < total - 1) setStep(step + 1);
    else submit();
  }

  function goBack() {
    setError(null);
    if (step > 0) setStep(step - 1);
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden text-foreground">
      <div className="relative w-full max-w-xl py-12">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-bold tracking-tighter"><span className="text-amber">MYFLOW</span> ✦</span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-foreground/60">Step {step + 1} / {total}</span>
        </div>

        <div className="mt-4 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step + (current.valid ? 1 : 0)) / total) * 100}%` }} />
        </div>

        <div key={step} className="mt-10 rounded-3xl bg-card/90 backdrop-blur border border-amber/30 shadow-[0_20px_60px_-25px_rgba(255,209,0,0.35)] p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-balance">
            {current.label}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{current.helper}</p>

          <div className="mt-6">
            {current.key === "name" && (
              <Input
                autoFocus
                value={name}
                onChange={(e) => { setError(null); setName(e.target.value.replace(/[^A-Za-z\s'-]/g, "")); }}
                onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                placeholder="e.g. Alex"
                className="h-12 text-lg bg-background/60 border-amber/30"
              />
            )}

            {current.key === "email" && (
              <Input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => { setError(null); setEmail(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                placeholder="you@example.com"
                className="h-12 text-lg bg-background/60 border-amber/30"
              />
            )}

            {current.key === "age" && (
              <div className="grid grid-cols-6 gap-2">
                {AGE_OPTIONS.map((a) => {
                  const on = age === String(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setError(null); setAge(String(a)); }}
                      className={`h-12 rounded-xl border font-display font-semibold transition-all ${on ? "bg-primary text-primary-foreground border-primary scale-[1.05] shadow-[0_0_20px_-4px_var(--amber)]" : "bg-background/60 hover:bg-amber/10 hover:border-amber/50 border-border"}`}
                    >{a}</button>
                  );
                })}
              </div>
            )}

            {current.key === "education" && (
              <div className="space-y-2">
                {EDUCATION_OPTIONS.map((o) => {
                  const on = education === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => { setError(null); setEducation(o.value); }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${on ? "bg-primary/20 border-primary text-foreground" : "bg-background/60 hover:bg-amber/10 hover:border-amber/50 border-border"}`}
                    >{o.label}</button>
                  );
                })}
                {education === "other" && (
                  <Input
                    value={customEducation}
                    onChange={(e) => setCustomEducation(e.target.value)}
                    placeholder="Describe your current stage, e.g. gap year, freelancer"
                    className="bg-background/60 border-amber/30"
                  />
                )}
              </div>
            )}

            {current.key === "skills" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[...SKILL_OPTIONS, "Other"].map((s) => {
                    const on = skills.has(s);
                    return (
                      <label
                        key={s}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-sm cursor-pointer transition-all ${on ? "border-primary bg-primary/15" : "border-border bg-background/60 hover:bg-amber/10 hover:border-amber/50"}`}
                      >
                        <Checkbox checked={on} onCheckedChange={() => { setError(null); toggleSkill(s); }} />
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
                    className="bg-background/60 border-amber/30"
                  />
                )}
              </div>
            )}

            {current.key === "goal" && (
              <Input
                autoFocus
                value={goal}
                onChange={(e) => { setError(null); setGoal(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                placeholder="e.g. Get into a great college, land my first internship"
                className="h-12 text-base bg-background/60 border-amber/30"
              />
            )}

            {current.key === "oneLiner" && (
              <Input
                autoFocus
                value={oneLiner}
                onChange={(e) => { setError(null); setOneLiner(e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                placeholder="e.g. A curious builder who loves stories and startups"
                className="h-12 text-base bg-background/60 border-amber/30"
              />
            )}

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={goBack}>← Back</Button>
            <Button size="lg" className="rounded-full px-6" onClick={goNext}>
              {step === total - 1 ? "Let's go ✦" : "Next →"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}