import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Loader2, CheckCircle2, XCircle, BookOpen, Lightbulb, BrainCircuit, MessagesSquare, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { getStudySet, submitQuiz, chatAboutSet } from "../lib/api";
import { mdToHtml } from "../lib/utils";
import { toast } from "sonner";

export default function StudySetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(params.get("tab") || "explanation");

  const load = async () => {
    try {
      const d = await getStudySet(id);
      setData(d);
    } catch (e) {
      toast.error("Could not load study set");
    }
  };

  useEffect(() => { load(); }, [id]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-up">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold">
          <span>{data.source_type}</span>
          <span className="text-slate-300">•</span>
          <span>{data.concepts.length} concepts</span>
          <span className="text-slate-300">•</span>
          <span>{data.questions.length} quiz questions</span>
        </div>
        <h1 className="font-display text-4xl font-bold mt-2">{data.title}</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border border-slate-200 p-1 rounded-full">
          <TabsTrigger value="explanation" className="rounded-full data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-5" data-testid="tab-explanation">
            <BookOpen className="w-4 h-4 mr-1.5" /> Explanation
          </TabsTrigger>
          <TabsTrigger value="concepts" className="rounded-full data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-5" data-testid="tab-concepts">
            <Lightbulb className="w-4 h-4 mr-1.5" /> Key Concepts
          </TabsTrigger>
          <TabsTrigger value="quiz" className="rounded-full data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-5" data-testid="tab-quiz">
            <BrainCircuit className="w-4 h-4 mr-1.5" /> Quiz
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-full data-[state=active]:bg-emerald-500 data-[state=active]:text-white px-5" data-testid="tab-chat">
            <MessagesSquare className="w-4 h-4 mr-1.5" /> Ask AI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explanation" className="mt-6">
          <article className="bg-white border border-slate-200 rounded-2xl p-8 prose-sm max-w-3xl" data-testid="explanation-content">
            <div dangerouslySetInnerHTML={{ __html: mdToHtml(data.explanation) }} />
          </article>
        </TabsContent>

        <TabsContent value="concepts" className="mt-6">
          <div className="grid md:grid-cols-2 gap-4" data-testid="concepts-grid">
            {data.concepts.map((c, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-emerald-500/40 transition-colors" data-testid={`concept-${idx}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-semibold text-lg">{c.term}</h3>
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold shrink-0 ${
                    c.importance === "core" ? "bg-emerald-100 text-emerald-700" :
                    c.importance === "important" ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>{c.importance}</span>
                </div>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">{c.definition}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <Quiz id={id} questions={data.questions} onSubmitted={load} />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatPanel id={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Quiz({ id, questions, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const arr = questions.map((q, i) => answers[i] ?? -1);
    if (arr.some((a) => a === -1)) {
      toast.error("Please answer all questions");
      return;
    }
    setSubmitting(true);
    try {
      const r = await submitQuiz(id, arr);
      setResult(r);
      toast.success(`Scored ${r.score}% — ${r.correct}/${r.total}`);
      onSubmitted();
    } catch (e) {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => { setAnswers({}); setResult(null); };

  return (
    <div className="space-y-5 max-w-3xl" data-testid="quiz-panel">
      {questions.map((q, qi) => {
        const selected = answers[qi];
        const r = result?.results?.[qi];
        return (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6" data-testid={`quiz-q-${qi}`}>
            <div className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Question {qi + 1}</div>
            <h3 className="font-display text-lg font-semibold mt-1">{q.question}</h3>
            <div className="mt-4 space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = selected === oi;
                const isCorrect = r && oi === q.correct_index;
                const isWrong = r && r.selected === oi && !r.is_correct;
                let cls = "border-slate-200 hover:border-slate-400 bg-white";
                if (result) {
                  if (isCorrect) cls = "border-emerald-500 bg-emerald-50";
                  else if (isWrong) cls = "border-rose-400 bg-rose-50";
                  else cls = "border-slate-200 bg-white opacity-70";
                } else if (isSelected) {
                  cls = "border-emerald-500 bg-emerald-50";
                }
                return (
                  <button
                    key={oi}
                    onClick={() => !result && setAnswers({ ...answers, [qi]: oi })}
                    disabled={!!result}
                    className={`w-full text-left border-2 rounded-xl px-4 py-3 text-sm flex items-center gap-3 transition-colors ${cls}`}
                    data-testid={`quiz-q${qi}-opt-${oi}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected || isCorrect ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {isWrong && <XCircle className="w-4 h-4 text-rose-500" />}
                  </button>
                );
              })}
            </div>
            {r && (
              <div className={`mt-3 text-sm rounded-lg px-3 py-2 ${r.is_correct ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
                <span className="font-semibold">{r.is_correct ? "Correct." : "Not quite."}</span> {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2">
        {result ? (
          <>
            <div className="text-2xl font-display font-bold">Score: <span className="text-emerald-600">{result.score}%</span> <span className="text-slate-400 text-base font-normal">({result.correct}/{result.total})</span></div>
            <Button onClick={retry} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full" data-testid="quiz-retry-btn">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry quiz
            </Button>
          </>
        ) : (
          <Button onClick={submit} disabled={submitting} className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-7" data-testid="quiz-submit-btn">
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Grading...</> : "Submit answers"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ id }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const r = await chatAboutSet(id, text);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      toast.error("AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl flex flex-col h-[560px]" data-testid="chat-panel">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {msgs.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-24">
            <MessagesSquare className="w-8 h-8 mx-auto mb-3 text-slate-300" />
            Ask anything about this material. Your tutor will answer in your learning style.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-emerald-500 text-white" : "bg-slate-50 border border-slate-200 text-slate-800"}`} data-testid={`chat-msg-${i}`}>
              {m.role === "user" ? (
                <span>{m.content}</span>
              ) : (
                <div className="prose-sm" dangerouslySetInnerHTML={{ __html: mdToHtml(m.content) }} />
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div></div>}
      </div>
      <div className="border-t border-slate-200 p-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          placeholder="Ask a follow-up question..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          data-testid="chat-input"
        />
        <Button onClick={send} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-10 h-10 p-0" data-testid="chat-send-btn">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
