import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ageNum = parseInt(age, 10);
    if (!name.trim() || !ageNum || ageNum < 8 || ageNum > 99) return;
    localStorage.setItem("myflow.session", JSON.stringify({ name: name.trim(), age: ageNum }));
    navigate({ to: "/pick" });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
      <div className="w-full max-w-lg">
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
            <Label htmlFor="age">Your age</Label>
            <Input id="age" type="number" min={8} max={99} required value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 17" />
          </div>
          <Button type="submit" className="w-full" size="lg">Continue</Button>
        </form>
      </div>
    </main>
  );
}