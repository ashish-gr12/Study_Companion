import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, FileText, ArrowRight, Lightbulb, Loader2, Play, History } from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { createFromNotes, createFromPdf, createFromTopic, listStudySets, getStats } from "../lib/api";
import { statusMeta, timeAgo, sourceIcon } from "../lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Dashboard() {
  const nav = useNavigate();
  const [sets, setSets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openNotes, setOpenNotes] = useState(false);
  const [openTopic, setOpenTopic] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [topicText, setTopicText] = useState("");
  const fileRef = useRef(null);

  const load = async () => {
    const [s, st] = await Promise.all([listStudySets(), getStats()]);
    setSets(s);
    setStats(st);
  };

  useEffect(() => { load(); }, []);

  const handlePdfPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("PDF must be under 50MB");
      return;
    }
    setLoading(true);
    toast.message("Parsing PDF & generating your study set...", { description: "This takes 15-40 seconds." });
    try {
      const created = await createFromPdf(file);
      toast.success("Study set created");
      nav(`/set/${created.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create study set");
    } finally {
      setLoading(false);
    }
  };

  const handleNotes = async () => {
    if (!notesText.trim()) { toast.error("Paste some notes first"); return; }
    setLoading(true);
    toast.message("Analyzing your notes...");
    try {
      const created = await createFromNotes(null, notesText.trim());
      toast.success("Study set created");
      setOpenNotes(false); setNotesText("");
      nav(`/set/${created.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTopic = async () => {
    if (!topicText.trim()) { toast.error("Enter a topic"); return; }
    setLoading(true);
    toast.message("Building your study set on this topic...");
    try {
      const created = await createFromTopic(topicText.trim());
      toast.success("Study set created");
      setOpenTopic(false); setTopicText("");
      nav(`/set/${created.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const recent = sets.slice(0, 3);
  const weeklyHours = stats?.weekly_hours ?? 0;
  const goal = stats?.weekly_goal_hours ?? 12;
  const daysActive = new Set(stats?.days_active ?? []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl bg-[#0B192C] text-white p-10 md:p-14 fade-up grain"
        data-testid="dashboard-hero"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.28em] text-emerald-400 font-semibold mb-4">Ready for a deep session?</div>
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
            Expand your mind
          </h1>
          <p className="mt-4 text-slate-300 text-base md:text-lg max-w-lg leading-relaxed">
            Your AI tutor is ready to synthesize your PDFs, notes, and topics into personalized explanations, flashcards, and quizzes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => fileRef.current?.click()} className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-full px-6 py-5 font-semibold" data-testid="hero-upload-btn">
              <FileUp className="w-4 h-4 mr-2" /> Upload PDF
            </Button>
            <Button onClick={() => setOpenTopic(true)} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full px-6 py-5" data-testid="hero-topic-btn">
              Start from topic
            </Button>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-10 -top-10 w-[520px] h-[520px] opacity-80 hidden md:block">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl" />
          <svg viewBox="0 0 520 520" className="relative w-full h-full">
            <defs>
              <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#064E3B" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <circle cx="260" cy="260" r="180" fill="url(#g1)" opacity="0.35" />
            <circle cx="260" cy="260" r="140" fill="none" stroke="#10B981" strokeOpacity="0.5" strokeWidth="1" />
            <circle cx="260" cy="260" r="100" fill="none" stroke="#10B981" strokeOpacity="0.7" strokeWidth="1" />
            <circle cx="260" cy="260" r="60" fill="#10B981" opacity="0.35" />
            <path d="M 110 260 Q 260 120 410 260 T 410 260" stroke="#10B981" strokeOpacity="0.8" strokeWidth="2" fill="none" />
            <g stroke="#10B981" strokeOpacity="0.6">
              <line x1="260" y1="80" x2="260" y2="440" />
              <line x1="80" y1="260" x2="440" y2="260" />
            </g>
          </svg>
        </div>
      </section>

      {/* Action Cards */}
      <section className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="group text-left bg-white border border-slate-200 hover:border-emerald-500/50 rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-6px_rgba(16,185,129,0.2)] transition-all fade-up stagger-1 relative overflow-hidden"
          data-testid="upload-pdf-card"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500 opacity-100" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mb-6">
            <FileUp className="w-5 h-5" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold">Upload PDF</h3>
              <p className="mt-2 text-slate-500 text-sm leading-relaxed">Drop your textbook chapters, research papers, or lecture slides. Up to 50MB.</p>
              <div className="mt-5 flex gap-2">
                <span className="text-[11px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">Text extraction</span>
                <span className="text-[11px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">Multi-page</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </div>
        </button>

        <button
          onClick={() => setOpenNotes(true)}
          className="group text-left bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-6px_rgba(0,0,0,0.08)] transition-all fade-up stagger-2 relative overflow-hidden"
          data-testid="paste-notes-card"
        >
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-900 opacity-100" />
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-6">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold">Paste Notes</h3>
              <p className="mt-2 text-slate-500 text-sm leading-relaxed">Paste lecture notes, a blog, or any text to instantly generate a structured study set.</p>
              <div className="mt-5 flex gap-2">
                <span className="text-[11px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">Auto-format</span>
                <span className="text-[11px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">Concepts + quiz</span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
          </div>
        </button>
      </section>

      {/* Recent Study Sets */}
      <section className="fade-up stagger-3">
        <div className="flex items-end justify-between mb-5">
          <h2 className="font-display text-2xl font-semibold">Recent Study Sets</h2>
          <button onClick={() => nav("/library")} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1" data-testid="view-library-link">
            View library <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <p className="text-slate-500">No study sets yet. Upload a PDF, paste notes, or start from a topic above.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {recent.map((s) => {
              const meta = statusMeta(s.status);
              return (
                <div
                  key={s.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow fade-up"
                  data-testid={`study-set-card-${s.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold tracking-wider">
                      {sourceIcon(s.source_type)}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold ${meta.chip}`}>{meta.label}</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold line-clamp-1">{s.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{s.status === "archived" ? "Completed" : "Updated"} {timeAgo(s.updated_at)}</p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>{s.status === "archived" ? "Score" : "Progress"}</span>
                      <span className="font-semibold text-slate-700">
                        {s.status === "archived" ? (s.score ?? 0) : s.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.status === "archived" ? "bg-slate-900" : "bg-emerald-500"}`}
                        style={{ width: `${s.status === "archived" ? (s.score ?? 0) : s.progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => nav(`/set/${s.id}`)}
                    className={`mt-5 w-full rounded-full py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${s.status === "archived" ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
                    data-testid={`study-set-resume-${s.id}`}
                  >
                    {s.status === "archived" ? <><History className="w-4 h-4" /> Review Performance</> : <><Play className="w-4 h-4" /> Resume Study</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Weekly goal + Smart Recommendation */}
      <section className="grid md:grid-cols-3 gap-6 fade-up stagger-4">
        <div className="md:col-span-2 bg-[#0f172a] text-white rounded-2xl p-7 grain relative overflow-hidden" data-testid="weekly-goal-card">
          <h3 className="font-display text-2xl font-semibold">Weekly Goal: {goal} Hours</h3>
          <p className="text-slate-300 text-sm mt-1">You've reached <span className="text-emerald-400 font-semibold">{weeklyHours}</span> hours of deep study this week. Keep it up!</p>

          <div className="mt-5 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex gap-2">
              {DAY_LABELS.map((d, i) => {
                const active = daysActive.has(i);
                return (
                  <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-emerald-500 text-white" : "bg-white/10 text-white/50"}`} data-testid={`day-chip-${i}`}>{d}</div>
                );
              })}
            </div>
            <Button onClick={() => document.querySelector('[data-testid="topbar-settings"]')?.click()} className="bg-emerald-500 hover:bg-emerald-400 text-white rounded-full px-5" data-testid="set-new-target-btn">Set New Target</Button>
          </div>
        </div>

        <div className="bg-[#450a0a] text-white rounded-2xl p-7 relative overflow-hidden grain" data-testid="smart-recommendation-card">
          <div className="w-9 h-9 rounded-full bg-rose-500/30 text-rose-200 flex items-center justify-center">
            <Lightbulb className="w-4 h-4" />
          </div>
          <h3 className="font-display text-lg font-semibold mt-4">Smart Recommendation</h3>
          <p className="text-rose-100/80 text-sm mt-2 leading-relaxed">{stats?.recommendation}</p>
          {stats?.weakest_set_id && (
            <button onClick={() => nav(`/set/${stats.weakest_set_id}?tab=quiz`)} className="mt-4 text-rose-200 hover:text-white text-sm font-medium underline underline-offset-4" data-testid="start-quick-practice-btn">Start Quick Practice →</button>
          )}
        </div>
      </section>

      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfPick} data-testid="hidden-pdf-input" />

      {/* Notes Modal (simple inline) */}
      {openNotes && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !loading && setOpenNotes(false)}>
          <div className="bg-white rounded-2xl p-7 max-w-2xl w-full" onClick={(e) => e.stopPropagation()} data-testid="notes-modal">
            <h3 className="font-display text-2xl font-semibold">Paste your notes</h3>
            <p className="text-slate-500 text-sm mt-1">We'll structure them and generate a personalized explanation + quiz.</p>
            <Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={10} className="mt-4" placeholder="Paste lecture notes, article text, or any study material..." data-testid="notes-textarea" />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpenNotes(false)} className="rounded-full" disabled={loading}>Cancel</Button>
              <Button onClick={handleNotes} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full" data-testid="notes-submit-btn">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : "Generate study set"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {openTopic && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !loading && setOpenTopic(false)}>
          <div className="bg-white rounded-2xl p-7 max-w-lg w-full" onClick={(e) => e.stopPropagation()} data-testid="topic-modal">
            <h3 className="font-display text-2xl font-semibold">What do you want to learn?</h3>
            <p className="text-slate-500 text-sm mt-1">Enter any topic and we'll generate study material tailored to your profile.</p>
            <input value={topicText} onChange={(e) => setTopicText(e.target.value)} className="mt-4 w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none" placeholder="e.g., Quantum entanglement basics" data-testid="topic-input" />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setOpenTopic(false)} className="rounded-full" disabled={loading}>Cancel</Button>
              <Button onClick={handleTopic} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full" data-testid="topic-submit-btn">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Building...</> : "Build study set"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading && !openNotes && !openTopic && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" data-testid="global-loading">
          <div className="bg-white rounded-2xl p-8 max-w-sm flex items-center gap-4 shadow-xl">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <div>
              <div className="font-semibold">Generating your study set</div>
              <div className="text-sm text-slate-500">GPT-5.2 is analyzing your material...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
