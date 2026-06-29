import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2, XCircle, ChevronRight, RotateCcw, Brain, Trophy,
  Zap, BookOpen, Plus, X, Globe, FileText, Youtube, Link,
  ChevronDown, ChevronUp, Lightbulb, Sparkles, Check,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type QType = "mc" | "tf" | "sa";
type Diff = "easy" | "medium" | "hard";
type DiffFilter = Diff | "all";
type Screen = "home" | "generating" | "quiz" | "results";
type UrlKind = "youtube" | "pdf" | "website";

interface StudyMaterial {
  id: string;
  urlKind: UrlKind;
  url: string;
  domain: string;
  youtubeId?: string;
}

interface Question {
  id: string;
  type: QType;
  topic: string;
  diff: Diff;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface Answer {
  qid: string;
  given: string;
  correct: boolean;
}

// Grading feedback per question
interface GradingResult {
  correct: boolean;
  feedback: string;
  pointsAwarded: number;
  maxPoints: number;
}

// ── Question Bank (local fallback only) ──────────────────────────────────

const QB: Question[] = [
  // ... (keep all your local questions as fallback, unchanged)
];

// ── Constants (unchanged) ─────────────────────────────────────────────────

const PRESET_TOPICS = ["Mixed", "Science", "History", "Geography", "Technology", "Mathematics", "Literature"];
const TOPIC_ICONS: Record<string, string> = {
  Mixed: "⚡", Science: "🔬", History: "🏛️", Geography: "🌍",
  Technology: "💻", Mathematics: "📐", Literature: "📖",
};
const COUNTS = [5, 7, 10, 15];
const DIFF_CONFIG = [ ... ]; // unchanged
const TYPE_CONFIG = [ ... ]; // unchanged
const GEN_STEPS_MATERIALS = [ ... ]; // unchanged
const GEN_STEPS_DEFAULT = [ ... ]; // unchanged
const TOPIC_KEYWORDS = { ... }; // unchanged

// ── Helpers ───────────────────────────────────────────────────────────────

// ... (keep all helper functions: uid, detectUrlKind, getYouTubeId, getDomain, extractKeywords, detectTopic, scoreQuestion, gradeShortAnswer, pickQuestions, scoreLabel)

// ── FadeScreen, SectionLabel, MaterialsPanel ──────────────────────────────

// (keep these components unchanged – they are the same)

// ── HomeScreen ────────────────────────────────────────────────────────────

// (keep HomeScreen unchanged – it only collects settings)

// ── GeneratingScreen ─────────────────────────────────────────────────────

// (keep GeneratingScreen unchanged)

// ── QuizScreen ──────────────────────────────────────────────────────────

function QuizScreen({
  q, idx, total, selected, setSelected,
  submitted, onSubmit, onNext, answers,
  gradingResult,   // new prop
}: {
  q: Question; idx: number; total: number;
  selected: string; setSelected: (s: string) => void;
  submitted: boolean; onSubmit: () => void; onNext: () => void;
  answers: Answer[];
  gradingResult: GradingResult | null;   // feedback for current question
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastAnswer = answers[answers.length - 1];
  const isCorrect = submitted && gradingResult ? gradingResult.correct : false;
  const isLast = idx === total - 1;
  const progress = ((idx + (submitted ? 1 : 0)) / total) * 100;

  useEffect(() => {
    if (q.type === "sa" && textRef.current && !submitted) textRef.current.focus();
  }, [q.id, submitted]);

  const diffBadge: Record<Diff, string> = {
    easy: "bg-emerald-50 text-emerald-600",
    medium: "bg-amber-50 text-amber-600",
    hard: "bg-rose-50 text-rose-600",
  };

  return (
    <FadeScreen>
      {/* Header */}
      <div className="bg-card border-b border-border px-6 md:px-10 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-foreground">QuizAI</span>
        </div>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>
        <span className="text-sm font-semibold text-muted-foreground shrink-0"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {idx + 1}/{total}
        </span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Question */}
        <div className="flex-1 px-6 md:px-10 py-8 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffBadge[q.diff]}`}>
                {q.diff.charAt(0).toUpperCase() + q.diff.slice(1)}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {q.topic}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {q.type === "mc" ? "Multiple Choice" : q.type === "tf" ? "True / False" : "Short Answer"}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-snug">{q.question}</h2>
          </div>

          {/* Answer options */}
          {(q.type === "mc" || q.type === "tf") && (
            <div className="space-y-2.5">
              {q.options!.map((opt) => {
                const isSel = selected === opt;
                const isAns = opt === q.answer;
                let cls = "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5";
                if (submitted) {
                  if (isAns) cls = "border-emerald-300 bg-emerald-50 text-emerald-700";
                  else if (isSel) cls = "border-rose-300 bg-rose-50 text-rose-700";
                  else cls = "border-border bg-muted/30 text-muted-foreground opacity-50";
                } else if (isSel) cls = "border-primary bg-primary/8 text-primary ring-1 ring-primary/20";
                return (
                  <button key={opt} disabled={submitted} onClick={() => setSelected(opt)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left disabled:cursor-default ${cls}`}
                    style={isSel && !submitted ? { background: "rgb(124 58 237 / 0.06)" } : {}}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      submitted && isAns ? "border-emerald-500 bg-emerald-500"
                      : submitted && isSel ? "border-rose-500 bg-rose-500"
                      : isSel ? "border-primary bg-primary"
                      : "border-border"
                    }`}>
                      {((submitted && isAns) || (!submitted && isSel)) && (
                        <div className={`w-2 h-2 rounded-full ${submitted && isAns ? "bg-white" : "bg-white"}`} />
                      )}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "sa" && (
            <div>
              <textarea ref={textRef} value={selected}
                onChange={(e) => !submitted && setSelected(e.target.value)}
                disabled={submitted} placeholder="Type your answer here…" rows={3}
                className={`w-full bg-card border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none transition-colors duration-150 ${
                  submitted
                    ? isCorrect ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"
                    : "border-border focus:border-primary/40"
                } disabled:opacity-70 disabled:cursor-default`}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !submitted) { e.preventDefault(); onSubmit(); } }} />
              {!submitted && (
                <p className="text-xs text-muted-foreground mt-1.5">Press Enter to submit</p>
              )}
            </div>
          )}

          <div>
            {!submitted ? (
              <button onClick={onSubmit} disabled={!selected.trim()}
                className="bg-primary text-white rounded-xl px-7 py-3 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-primary/20">
                Submit Answer
              </button>
            ) : (
              <button onClick={onNext}
                className="bg-primary text-white rounded-xl px-7 py-3 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex items-center gap-2 shadow-md shadow-primary/20">
                {isLast ? "See Results" : "Next Question"}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Feedback panel */}
        {submitted && gradingResult && (
          <div style={{ animation: "slideIn 0.3s ease-out both" }}
            className="md:w-80 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col">
            <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }`}</style>
            <div className={`px-6 py-5 border-b border-border flex items-center gap-3 ${gradingResult.correct ? "bg-emerald-50" : "bg-rose-50"}`}>
              {gradingResult.correct
                ? <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
                : <XCircle className="text-rose-500 shrink-0" size={22} />}
              <div>
                <p className={`font-bold text-sm ${gradingResult.correct ? "text-emerald-700" : "text-rose-700"}`}>
                  {gradingResult.correct ? "Correct! 🎉" : "Not quite"}
                </p>
                {!gradingResult.correct && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Answer: <span className="text-emerald-600 font-semibold">{q.answer}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-5 flex-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Feedback</p>
              <p className="text-sm text-foreground leading-relaxed">{gradingResult.feedback}</p>
            </div>
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Score so far</p>
              <p className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {answers.filter((a) => a.correct).length}
                <span className="text-muted-foreground font-normal text-base"> / {answers.length}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </FadeScreen>
  );
}

// ── ResultsScreen (unchanged) ───────────────────────────────────────────

function ResultsScreen({ questions, answers, score, pct, onRestart }) { /* ... keep as is */ }

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [topic, setTopic] = useState("Mixed");
  const [qCount, setQCount] = useState(7);
  const [diff, setDiff] = useState<DiffFilter>("all");
  const [selectedTypes, setSelectedTypes] = useState<QType[]>(["mc", "tf", "sa"]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [notes, setNotes] = useState("");
  // New state for grading result per question
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);

  const noteKeywords = extractKeywords(notes);
  const detectedTopic = notes.trim().length > 30 ? detectTopic(noteKeywords) : null;

  useEffect(() => {
    if (detectedTopic) setTopic(detectedTopic);
  }, [detectedTopic]);

  const hasMaterials = materials.length > 0 || notes.trim().length > 0;
  const materialCount = materials.length + (notes.trim() ? 1 : 0);

  // ── startQuiz: fetch from backend ──────────────────────────────────────
  const startQuiz = async () => {
    setGenStep(0);
    setScreen("generating");

    const steps = hasMaterials ? GEN_STEPS_MATERIALS : GEN_STEPS_DEFAULT;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setGenStep(step);
      if (step >= steps.length - 1) {
        clearInterval(iv);
        // Call backend
        try {
          const payload = {
            topic: topic,
            difficulty: diff === "all" ? "Intermediate" : diff,
            count: qCount,
          };
          // If we have refinement later, we can add refinement_prompt, but not here.
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
            .then(res => res.json())
            .then(data => {
              if (data.status === 'error') {
                console.error('Generation error:', data.error);
                // fallback to local
                const qs = pickQuestions(topic, qCount, hasMaterials ? noteKeywords : [], diff, selectedTypes);
                setQuestions(qs);
                setIdx(0);
                setAnswers([]);
                setSelected("");
                setSubmitted(false);
                setGradingResult(null);
                setTimeout(() => setScreen("quiz"), 400);
                return;
              }
              // Map backend response to Question type
              const qs: Question[] = data.questions.map((q: any, index: number) => ({
                id: q.id || `gen-${index}`,
                type: "sa", // we only generate short-answer
                topic: data.topic || topic,
                diff: (data.difficulty || "easy") as Diff,
                question: q.question_text,
                answer: q.answer || "",
                explanation: q.explanation || "",
              }));
              setQuestions(qs);
              setIdx(0);
              setAnswers([]);
              setSelected("");
              setSubmitted(false);
              setGradingResult(null);
              setTimeout(() => setScreen("quiz"), 400);
            })
            .catch(err => {
              console.error('API error:', err);
              // fallback
              const qs = pickQuestions(topic, qCount, hasMaterials ? noteKeywords : [], diff, selectedTypes);
              setQuestions(qs);
              setIdx(0);
              setAnswers([]);
              setSelected("");
              setSubmitted(false);
              setGradingResult(null);
              setTimeout(() => setScreen("quiz"), 400);
            });
        } catch (e) {
          // fallback
          const qs = pickQuestions(topic, qCount, hasMaterials ? noteKeywords : [], diff, selectedTypes);
          setQuestions(qs);
          setIdx(0);
          setAnswers([]);
          setSelected("");
          setSubmitted(false);
          setGradingResult(null);
          setTimeout(() => setScreen("quiz"), 400);
        }
      }
    }, 500);
  };

  // ── submit: grade current answer via backend ────────────────────────────
  const submit = async () => {
    const trimmed = selected.trim();
    if (!trimmed) return;
    const q = questions[idx];

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [
            {
              id: q.id,
              question: q.question,
              user_answer: trimmed,
            }
          ]
        })
      });
      const data = await response.json();
      if (data.status === 'error') {
        console.error('Grading error:', data.error);
        // fallback to local grading
        const correct = q.type === "sa" ? gradeShortAnswer(trimmed, q.answer) : trimmed === q.answer;
        setAnswers(prev => [...prev, { qid: q.id, given: trimmed, correct }]);
        setGradingResult({
          correct,
          feedback: q.explanation,
          pointsAwarded: correct ? 10 : 0,
          maxPoints: 10,
        });
        setSubmitted(true);
        return;
      }
      // Parse grading result (assuming one result)
      const result = data.results?.[0];
      if (!result) {
        throw new Error('No grading result');
      }
      const correct = result.is_correct;
      setAnswers(prev => [...prev, { qid: q.id, given: trimmed, correct }]);
      setGradingResult({
        correct,
        feedback: result.ai_feedback || q.explanation,
        pointsAwarded: result.points_awarded || (correct ? 10 : 0),
        maxPoints: result.max_points || 10,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Grading API error:', err);
      // fallback local
      const correct = q.type === "sa" ? gradeShortAnswer(trimmed, q.answer) : trimmed === q.answer;
      setAnswers(prev => [...prev, { qid: q.id, given: trimmed, correct }]);
      setGradingResult({
        correct,
        feedback: q.explanation,
        pointsAwarded: correct ? 10 : 0,
        maxPoints: 10,
      });
      setSubmitted(true);
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setScreen("results"); }
    else { setIdx((i) => i + 1); setSelected(""); setSubmitted(false); setGradingResult(null); }
  };

  const restart = () => {
    setScreen("home"); setAnswers([]); setSelected("");
    setSubmitted(false); setIdx(0); setQuestions([]); setGradingResult(null);
  };

  const score = answers.filter((a) => a.correct).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const q = questions[idx];

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {screen === "home" && (
        <HomeScreen topic={topic} setTopic={setTopic} qCount={qCount} setQCount={setQCount}
          onStart={startQuiz} materials={materials} setMaterials={setMaterials}
          notes={notes} setNotes={setNotes} detectedTopic={detectedTopic}
          diff={diff} setDiff={setDiff}
          selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} />
      )}
      {screen === "generating" && (
        <GeneratingScreen step={genStep} topic={topic} hasMaterials={hasMaterials}
          materialCount={materialCount} diff={diff} selectedTypes={selectedTypes} />
      )}
      {screen === "quiz" && q && (
        <QuizScreen q={q} idx={idx} total={questions.length}
          selected={selected} setSelected={setSelected}
          submitted={submitted} onSubmit={submit} onNext={next}
          answers={answers} gradingResult={gradingResult} />
      )}
      {screen === "results" && (
        <ResultsScreen questions={questions} answers={answers} score={score} pct={pct} onRestart={restart} />
      )}
    </div>
  );
}