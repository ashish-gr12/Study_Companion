import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Play } from "lucide-react";
import { listStudySets } from "../lib/api";
import { statusMeta, timeAgo } from "../lib/utils";

export default function Practice() {
  const nav = useNavigate();
  const [sets, setSets] = useState([]);
  useEffect(() => { listStudySets().then(setSets); }, []);

  const withQuiz = sets.filter((s) => s.num_questions > 0);

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
          <Target className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold">Practice</h1>
          <p className="text-slate-500 mt-1">Retry quizzes from your library to strengthen weak areas.</p>
        </div>
      </div>

      {withQuiz.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-14 text-center">
          <p className="text-slate-500">Create a study set first to start practicing.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {withQuiz.map((s) => {
            const meta = statusMeta(s.status);
            return (
              <button
                key={s.id}
                onClick={() => nav(`/set/${s.id}?tab=quiz`)}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-emerald-500/40 hover:shadow-md transition-all"
                data-testid={`practice-card-${s.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">{s.num_questions} QUESTIONS</span>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ${meta.chip}`}>{meta.label}</span>
                </div>
                <h3 className="font-display text-lg font-semibold line-clamp-2">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1">Last updated {timeAgo(s.updated_at)}</p>
                {s.score !== null && s.score !== undefined && (
                  <p className="text-sm text-slate-600 mt-3">Last score: <span className="font-semibold text-emerald-600">{s.score}%</span></p>
                )}
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Play className="w-4 h-4" /> Start quiz
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
