import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const steps = useMemo(() => [
    { key: "name", valid: nameValid, tone: "peach" },
    { key: "age", valid: ageValid, tone: "lemon" },
    { key: "education", valid: educationValid, tone: "mint" },
    { key: "skills", valid: skillsValid, tone: "blue" },
    { key: "goal", valid: goalValid, tone: "lilac" },
    { key: "oneLiner", valid: oneLinerValid, tone: "peach" },
  ] as const, [nameValid, ageValid, educationValid, skillsValid, goalValid, oneLinerValid]);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + (current.valid ? 1 : 0)) / steps.length) * 100;

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
    if (!current.valid) return;
    if (isLast) finish();
    else setStep((s) => s + 1);
  }

  const toneBg: Record<string, string> = {
    peach: "from-pastel-peach via-paper to-pastel-lemon",
    lemon: "from-pastel-lemon via-paper to-pastel-mint",
    mint: "from-pastel-mint via-paper to-pastel-blue",
    blue: "from-pastel-blue via-paper to-pastel-lilac",
    lilac: "from-pastel-lilac via-paper to-pastel-peach",
  };

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${toneBg[current.tone]} text-foreground px-6 transition-colors duration-700`}>
      <div className="w-full max-w-xl py-10">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-bold tracking-tighter">MYFLOW ✿</span>
          <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
            {step + 1} / {steps.length}
          </span>
        </div>
        <div className="mt-4 h-1.5 w-full bg-white/60 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div key={step} className="mt-10 animate-in fade-in slide-in-from-bottom-3 duration-500">
          {step === 0 && (
            <QuestionCard emoji="👋" question="What's your name?" hint="Just so we can make this feel like yours.">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^A-Za-z\s'-]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="e.g. Alex"
                className="h-14 text-lg rounded-2xl bg-white"
              />
            </QuestionCard>
          )}
          {step === 1 && (
            <QuestionCard emoji="🎂" question={`Nice to meet you${trimmedName ? ", " + trimmedName : ""}. How old are you?`} hint="Pick your age.">
              <div className="grid grid-cols-6 gap-2">
                {AGE_OPTIONS.map((a) => {
                  const on = age === String(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAge(String(a))}
                      className={`h-12 rounded-xl border font-mono text-sm transition-all ${on ? "border-primary bg-primary text-primary-foreground scale-105" : "border-border bg-white hover:bg-muted"}`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </QuestionCard>
          )}
          {step === 2 && (
            <QuestionCard emoji="🎓" question="Where are you right now?" hint="Helps us match real opportunities to your stage.">
              <div className="grid gap-2">
                {EDUCATION_OPTIONS.map((o) => {
                  const on = education === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setEducation(o.value)}
                      className={`text-left p-4 rounded-xl border transition-all ${on ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-white hover:bg-muted"}`}
                    >
                      {o.label}
                    </button>
                  );
                })}
                {education === "other" && (
                  <Input
                    autoFocus
                    value={customEducation}
                    onChange={(e) => setCustomEducation(e.target.value)}
                    placeholder="Describe your current stage"
                    className="mt-1 bg-white"
                  />
                )}
              </div>
            </QuestionCard>
          )}
          {step === 3 && (
            <QuestionCard emoji="✨" question="Skills you already have" hint="Pick any that feel true — even basic ones.">
              <div className="flex flex-wrap gap-2">
                {[...SKILL_OPTIONS, "Other"].map((s) => {
                  const on = skills.has(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSkill(s)}
                      className={`px-4 py-2 rounded-full border text-sm transition-all ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white hover:bg-muted"}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {skills.has("Other") && (
                <Input
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Type your skill(s), e.g. music production, chess"
                  className="mt-3 bg-white"
                />
              )}
            </QuestionCard>
          )}
          {step === 4 && (
            <QuestionCard emoji="🎯" question="What's your current goal?" hint="Big or small — anything you're working towards.">
              <Input
                autoFocus
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="e.g. Land my first internship"
                className="h-14 text-lg rounded-2xl bg-white"
              />
            </QuestionCard>
          )}
          {step === 5 && (
            <QuestionCard emoji="💫" question="Describe yourself in one line." hint="A line about you helps us personalise things.">
              <Input
                autoFocus
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="e.g. A curious builder who loves stories and startups"
                className="h-14 text-lg rounded-2xl bg-white"
              />
            </QuestionCard>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← Back
            </Button>
            <Button
              size="lg"
              className="rounded-full px-8"
              disabled={!current.valid}
              onClick={next}
            >
              {isLast ? "Continue ✧" : "Next →"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuestionCard({ emoji, question, hint, children }: { emoji: string; question: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-white/70 backdrop-blur-sm p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(30,30,60,0.3)]">
      <div className="text-4xl">{emoji}</div>
      <h1 className="mt-3 font-display text-2xl md:text-3xl font-bold tracking-tight text-balance">
        {question}
      </h1>
      {hint && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}