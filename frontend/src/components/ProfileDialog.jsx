import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useProfile } from "../context/ProfileContext";
import { toast } from "sonner";

export default function ProfileDialog({ open, onOpenChange }) {
  const { profile, save } = useProfile();
  const [form, setForm] = useState({
    name: "",
    level: "undergrad",
    learning_style: "example_driven",
    goals: "",
    weekly_goal_hours: 12,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        level: profile.level || "undergrad",
        learning_style: profile.learning_style || "example_driven",
        goals: profile.goals || "",
        weekly_goal_hours: profile.weekly_goal_hours || 12,
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(form);
      toast.success("Profile updated — future explanations will adapt to you.");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" data-testid="profile-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Personalize your learning</DialogTitle>
          <DialogDescription>Your tutor will adapt explanations, examples, and question difficulty to this profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name-input" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Academic level</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger className="mt-1" data-testid="profile-level-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_school">High school</SelectItem>
                  <SelectItem value="undergrad">Undergraduate</SelectItem>
                  <SelectItem value="grad">Graduate</SelectItem>
                  <SelectItem value="self_learner">Self-learner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Learning style</Label>
              <Select value={form.learning_style} onValueChange={(v) => setForm({ ...form, learning_style: v })}>
                <SelectTrigger className="mt-1" data-testid="profile-style-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual diagrams</SelectItem>
                  <SelectItem value="example_driven">Example-driven</SelectItem>
                  <SelectItem value="concise">Concise / bullet</SelectItem>
                  <SelectItem value="deep_dive">Deep dive</SelectItem>
                  <SelectItem value="analogy">Analogies & stories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Learning goals</Label>
            <Textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              rows={3}
              data-testid="profile-goals-input"
              className="mt-1"
              placeholder="e.g., Ace my organic chemistry midterm and understand reaction mechanisms"
            />
          </div>
          <div>
            <Label>Weekly study goal (hours)</Label>
            <Input type="number" min="1" max="50" value={form.weekly_goal_hours} onChange={(e) => setForm({ ...form, weekly_goal_hours: Number(e.target.value) })} data-testid="profile-goal-hours-input" className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full" data-testid="profile-cancel-btn">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full" data-testid="profile-save-btn">
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
