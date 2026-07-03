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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("display_name, age_band").eq("user_id", u.user.id).maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAgeBand(data.age_band ?? "");
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
        <Button onClick={save}>Save</Button>
      </div>
    </div>
  );
}