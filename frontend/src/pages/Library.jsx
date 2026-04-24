import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Play, History, Plus } from "lucide-react";
import { listStudySets, deleteStudySet } from "../lib/api";
import { statusMeta, timeAgo, sourceIcon } from "../lib/utils";
import { toast } from "sonner";

export default function Library() {
  const nav = useNavigate();
  const [sets, setSets] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = async () => setSets(await listStudySets());
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this study set?")) return;
    await deleteStudySet(id);
    toast.success("Deleted");
    load();
  };

  const filtered = filter === "all" ? sets : sets.filter((s) => s.status === filter);

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h1 className="font-display text-4xl font-bold">Your Library</h1>
        <p className="text-slate-500 mt-1">{sets.length} study set{sets.length !== 1 ? "s" : ""} — everything you've learned.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { k: "all", l: "All" },
          { k: "in_progress", l: "In progress" },
          { k: "quiz_ready", l: "Quiz ready" },
          { k: "archived", l: "Archived" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === t.k ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
            data-testid={`library-filter-${t.k}`}
          >
            {t.l}
          </button>
        ))}
        <button onClick={() => nav("/")} className="ml-auto px-4 py-1.5 rounded-full text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5" data-testid="library-new-btn">
          <Plus className="w-4 h-4" /> New study set
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-14 text-center">
          <p className="text-slate-500">No study sets in this view.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => {
            const meta = statusMeta(s.status);
            return (
              <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow relative group" data-testid={`library-card-${s.id}`}>
                <button onClick={() => handleDelete(s.id)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500" data-testid={`delete-${s.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold tracking-wider">{sourceIcon(s.source_type)}</div>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ${meta.chip}`}>{meta.label}</span>
                </div>
                <h3 className="font-display text-lg font-semibold line-clamp-2">{s.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{s.num_concepts} concepts · {s.num_questions} questions · {timeAgo(s.updated_at)}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span>{s.status === "archived" ? "Score" : "Progress"}</span>
                    <span className="font-semibold text-slate-700">{s.status === "archived" ? (s.score ?? 0) : s.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${s.status === "archived" ? "bg-slate-900" : "bg-emerald-500"}`} style={{ width: `${s.status === "archived" ? (s.score ?? 0) : s.progress}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => nav(`/set/${s.id}`)}
                  className={`mt-5 w-full rounded-full py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${s.status === "archived" ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
                >
                  {s.status === "archived" ? <><History className="w-4 h-4" /> Review</> : <><Play className="w-4 h-4" /> Open</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
