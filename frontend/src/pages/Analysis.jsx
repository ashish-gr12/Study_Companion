import React, { useEffect, useState } from "react";
import { BarChart3, Clock, Trophy, TrendingUp } from "lucide-react";
import { listStudySets, getStats } from "../lib/api";

export default function Analysis() {
  const [sets, setSets] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([listStudySets(), getStats()]).then(([s, st]) => { setSets(s); setStats(st); });
  }, []);

  const scored = sets.filter((s) => s.score !== null && s.score !== undefined);
  const avgScore = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
  const completed = sets.filter((s) => s.status === "archived").length;

  const metrics = [
    { label: "Weekly hours", value: `${stats?.weekly_hours ?? 0}h`, icon: Clock, color: "emerald" },
    { label: "Average score", value: `${avgScore}%`, icon: Trophy, color: "amber" },
    { label: "Completed sets", value: completed, icon: TrendingUp, color: "blue" },
    { label: "Total study sets", value: sets.length, icon: BarChart3, color: "violet" },
  ];

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="font-display text-4xl font-bold">Analysis</h1>
        <p className="text-slate-500 mt-1">Your learning at a glance.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-2xl p-6" data-testid={`metric-${m.label.toLowerCase().replace(/\s/g, '-')}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <m.icon className="w-4 h-4" />
              </div>
              <div className="text-xs uppercase tracking-wider text-slate-500">{m.label}</div>
            </div>
            <div className="font-display text-3xl font-bold mt-3">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-7">
        <h2 className="font-display text-xl font-semibold mb-4">Quiz performance by set</h2>
        {scored.length === 0 ? (
          <p className="text-slate-500 text-sm">Take a quiz to see performance data here.</p>
        ) : (
          <div className="space-y-3">
            {scored.map((s) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className="w-48 truncate text-sm text-slate-700">{s.title}</div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.score >= 80 ? "bg-emerald-500" : s.score >= 60 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${s.score}%` }} />
                </div>
                <div className="w-12 text-right text-sm font-semibold">{s.score}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
