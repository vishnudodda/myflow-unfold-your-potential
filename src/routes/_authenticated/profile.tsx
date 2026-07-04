import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — MyFlow" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [country, setCountry] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, age_band, education_level, country, work_mode, experience_level")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAgeBand(data.age_band ?? "");
        setEducationLevel(data.education_level ?? "");
        setCountry(data.country ?? "");
        setWorkMode(data.work_mode ?? "");
        setExperienceLevel(data.experience_level ?? "");
      }
    })();
  }, []);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("profiles").upsert({
      user_id: u.user.id,
      display_name: displayName,
      age_band: (ageBand || null) as never,
      education_level: educationLevel || null,
      country: country || null,
      work_mode: workMode || null,
      experience_level: experienceLevel || null,
      onboarded_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-6 py-16 space-y-6">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
        <h1 className="font-display text-3xl font-bold">Your profile</h1>
        <p className="text-sm text-muted-foreground">These details personalize your AI recommendations, roadmap, and opportunity matches.</p>
        <div className="space-y-2">
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Age band</Label>
          <select value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            <option value="11_14">11–14</option>
            <option value="15_18">15–18</option>
            <option value="19_22">19–22</option>
            <option value="23_27">23–27</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Education level</Label>
          <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            <option value="middle_school">Middle school</option>
            <option value="high_school">High school</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="graduate">Graduate</option>
            <option value="postgraduate">Postgraduate</option>
            <option value="working">Working professional</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" />
        </div>
        <div className="space-y-2">
          <Label>Preferred work mode</Label>
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
            <option value="any">Any</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>Experience level</Label>
          <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select…</option>
            <option value="none">No experience yet</option>
            <option value="beginner">Beginner / student projects</option>
            <option value="intermediate">1–2 internships</option>
            <option value="advanced">Multiple internships or job experience</option>
          </select>
        </div>
        <Button onClick={save}>Save</Button>
      </div>
    </div>
  );
}