import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, Brain, Trophy, Zap, BookOpen, Plus, X, Globe, FileText, Link, ChevronDown, ChevronUp, Lightbulb, Sparkles, Check, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

type QType = "mc" | "tf" | "sa";
type Diff = "easy" | "medium" | "hard";
type DiffFilter = Diff | "all";
type Screen = "home" | "generating" | "quiz" | "results";
type UrlKind = "website" | "pdf";

interface StudyMaterial { id: string; urlKind: UrlKind; url: string; domain: string; }
interface Question { id: string; type: QType; topic: string; diff: Diff; question: string; options?: string[]; answer: string; explanation: string; }
interface Answer { qid: string; given: string; correct: boolean; }
interface GradingResult { correct: boolean; feedback: string; pointsAwarded: number; maxPoints: number; }

const PRESET_TOPICS = ["Mixed", "Science", "History", "Geography", "Technology", "Mathematics", "Literature"];
const TOPIC_ICONS: Record<string, string> = { Mixed: "⚡", Science: "🔬", History: "🏛️", Geography: "🌍", Technology: "💻", Mathematics: "📐", Literature: "📖" };
const COUNTS = [5, 7, 10, 15];
const DIFF_CONFIG = [
  { value: "easy" as DiffFilter, label: "Easy", color: "text-emerald-600", bg: "bg-emerald-50", activeBg: "bg-emerald-500", activeText: "text-white" },
  { value: "medium", label: "Medium", color: "text-amber-600", bg: "bg-amber-50", activeBg: "bg-amber-500", activeText: "text-white" },
  { value: "hard", label: "Hard", color: "text-rose-600", bg: "bg-rose-50", activeBg: "bg-rose-500", activeText: "text-white" }
];
const TYPE_CONFIG = [
  { value: "mc" as QType, label: "Multiple Choice", emoji: "🔘", desc: "4 options to choose from" },
  { value: "tf", label: "True / False", emoji: "⚖️", desc: "Evaluate the statement" },
  { value: "sa", label: "Short Answer", emoji: "✏️", desc: "Type your own answer" }
];
const GEN_STEPS_MATERIALS = ["Parsing study materials...", "Extracting key concepts...", "Selecting question types...", "Generating questions...", "Verifying accuracy..."];
const GEN_STEPS_DEFAULT = ["Choosing your topic...", "Selecting question types...", "Generating questions...", "Verifying accuracy...", "Almost ready..."];
const TOPIC_KEYWORDS: Record<string, string[]> = {
  Science: ["biology", "chemistry", "physics", "atom", "molecule", "cell", "dna", "gene", "force", "energy", "element", "compound", "reaction", "photosynthesis", "evolution", "gravity", "quantum", "electron", "nucleus", "protein", "enzyme", "newton", "orbit", "radiation"],
  History: ["war", "century", "empire", "king", "queen", "president", "revolution", "ancient", "medieval", "civilization", "treaty", "battle", "dynasty", "colonial", "independence", "rome", "greece", "egypt", "renaissance", "industrial", "napoleon", "caesar"],
  Geography: ["country", "continent", "ocean", "mountain", "river", "capital", "climate", "population", "border", "latitude", "longitude", "region", "island", "desert", "valley", "equator", "hemisphere", "biome", "topography"],
  Technology: ["computer", "software", "hardware", "internet", "algorithm", "programming", "code", "data", "network", "digital", "artificial", "machine", "learning", "database", "html", "python", "javascript", "cpu", "binary", "encryption", "protocol", "server", "cloud"],
  Mathematics: ["equation", "formula", "theorem", "number", "calculus", "algebra", "geometry", "statistics", "probability", "function", "matrix", "vector", "integer", "fraction", "polynomial", "derivative", "integral", "prime", "logarithm", "trigonometry"],
  Literature: ["novel", "poem", "author", "character", "plot", "theme", "metaphor", "narrative", "fiction", "poetry", "prose", "genre", "protagonist", "antagonist", "shakespeare", "dickens", "austen", "orwell", "symbolism", "allegory"]
};

function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function detectUrlKind(url: string): UrlKind { if (/\.pdf($|\?)/i.test(url)) return "pdf"; return "website"; }
function getDomain(url: string): string { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function extractKeywords(text: string): string[] {
  const stop = new Set(["the","and","for","are","but","not","you","all","can","was","one","had","has","been","have","will","with","this","that","they","from","what","when","where","how","its","into","than","some","also","each","more","about","these","those"]);
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3 && !stop.has(w)))];
}
function detectTopic(keywords: string[]): string | null {
  const scores: Record<string, number> = {};
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) scores[topic] = keywords.filter(k => kws.some(tk => tk.includes(k) || k.includes(tk))).length;
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : null;
}
function normalizeQuestionType(rawType: unknown): QType {
  const value = String(rawType ?? "").toLowerCase();
  if (value.includes("multiple") || value === "mc") return "mc";
  if (value.includes("true") || value.includes("false") || value === "tf") return "tf";
  return "sa";
}
function normalizeDifficulty(rawDifficulty: unknown): Diff {
  const value = String(rawDifficulty ?? "").toLowerCase();
  if (value.includes("advanced") || value.includes("hard")) return "hard";
  if (value.includes("intermediate") || value.includes("medium")) return "medium";
  return "easy";
}
function gradeShortAnswer(given: string, answer: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const g = norm(given), a = norm(answer);
  if (!g) return false;
  if (g === a || g.includes(a) || a.includes(g)) return true;
  const kws = a.split(" ").filter(w => w.length > 3);
  if (kws.length === 0) return false;
  return kws.filter(k => g.includes(k)).length / kws.length >= 0.6;
}
function scoreLabel(pct: number): { label: string; sub: string; emoji: string } {
  if (pct === 100) return { label: "Perfect Score!", sub: "Absolutely flawless. Impressive.", emoji: "🏆" };
  if (pct >= 85) return { label: "Outstanding!", sub: "You have a strong command of this material.", emoji: "🌟" };
  if (pct >= 70) return { label: "Well Done!", sub: "Solid performance — keep building on this.", emoji: "👏" };
  if (pct >= 55) return { label: "Good Effort", sub: "You're getting there. Review the misses.", emoji: "💪" };
  if (pct >= 40) return { label: "Keep Practicing", sub: "Check the explanations to improve.", emoji: "📚" };
  return { label: "Keep Studying", sub: "Everyone starts somewhere. Review and retry.", emoji: "🌱" };
}

function FadeScreen({ children }: { children: ReactNode }) {
  return <div style={{ animation: "fadeUp 0.28s ease-out both" }} className="min-h-screen flex flex-col">
    <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`}</style>
    {children}
  </div>;
}
function SectionLabel({ step, children }: { step: string; children: ReactNode }) {
  return <div className="flex items-center gap-2 mb-3">
    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{step}</span>
    <span className="text-sm font-semibold text-foreground">{children}</span>
  </div>;
}

function MaterialsPanel({ materials, setMaterials, notes, setNotes, detectedTopic }: { materials: StudyMaterial[]; setMaterials: (m: StudyMaterial[]) => void; notes: string; setNotes: (s: string) => void; detectedTopic: string | null; }) {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const totalItems = materials.length + (notes.trim() ? 1 : 0);
  function addUrl() {
    const raw = urlInput.trim();
    if (!raw) return;
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try { new URL(url); } catch { setUrlError("Enter a valid URL"); return; }
    const urlKind = detectUrlKind(url);
    setMaterials([...materials, { id: uid(), urlKind, url, domain: getDomain(url) }]);
    setUrlInput(""); setUrlError("");
  }
  const kindIcon = (k: UrlKind) => k === "pdf" ? <FileText size={13} className="text-amber-500" /> : <Globe size={13} className="text-primary" />;
  const kindBadgeColor = (k: UrlKind) => k === "pdf" ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary";
  return <div className="rounded-2xl border border-border bg-card overflow-hidden">
    <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors duration-150">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen size={15} className="text-primary" /></div>
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground leading-none mb-0.5">Study Materials</p>
          <p className="text-xs text-muted-foreground">{totalItems > 0 ? `${totalItems} source${totalItems !== 1 ? "s" : ""} added` : "Add websites, PDFs, or notes"}</p>
        </div>
        {totalItems > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full ml-1">{totalItems}</span>}
      </div>
      {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
    </button>
    {open && <div className="border-t border-border p-5 space-y-4 bg-muted/20">
      <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
        <Lightbulb size={14} className="text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">Paste URLs for reference or add your own notes. The quiz engine uses your notes to find relevant questions.</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Add a Source URL</p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={urlInput} onChange={e => { setUrlInput(e.target.value); setUrlError(""); }} onKeyDown={e => { if (e.key === "Enter") addUrl(); }} placeholder="Paste a Wikipedia, PDF, or any URL…" className="w-full bg-card border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <button onClick={addUrl} className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0"><Plus size={14} /> Add</button>
        </div>
        {urlError && <p className="text-xs text-destructive mt-1.5">{urlError}</p>}
      </div>
      {materials.length > 0 && <div className="space-y-2">
        {materials.map(m => <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">{kindIcon(m.urlKind)}</div>
          <div className="flex-1 min-w-0">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mb-0.5 ${kindBadgeColor(m.urlKind)}`}>{m.urlKind.toUpperCase()}</span>
            <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground truncate block hover:text-primary transition-colors">{m.domain}</a>
          </div>
          <button onClick={() => setMaterials(materials.filter(x => x.id !== m.id))} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"><X size={13} /></button>
        </div>)}
      </div>}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground">Paste Notes or Key Content</p>
          {notes.trim().length > 0 && detectedTopic && <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1"><Sparkles size={11} className="text-primary" /><span className="text-xs text-primary font-semibold">Detected: {detectedTopic}</span></div>}
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paste your textbook chapter, lecture notes, article, or transcript here…" rows={5} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed" />
        <div className="flex justify-between mt-1"><p className="text-xs text-muted-foreground">Analysed locally — nothing leaves your browser.</p><span className="text-xs text-muted-foreground">{notes.length} chars</span></div>
      </div>
    </div>}
  </div>;
}

function HomeScreen({ topic, setTopic, qCount, setQCount, onStart, materials, setMaterials, notes, setNotes, detectedTopic, diff, setDiff, selectedTypes, setSelectedTypes }: {
  topic: string; setTopic: (t: string) => void; qCount: number; setQCount: (n: number) => void; onStart: () => void;
  materials: StudyMaterial[]; setMaterials: (m: StudyMaterial[]) => void; notes: string; setNotes: (s: string) => void;
  detectedTopic: string | null; diff: DiffFilter; setDiff: (d: DiffFilter) => void; selectedTypes: QType[]; setSelectedTypes: (t: QType[]) => void;
}) {
  const [customTopics, setCustomTopics] = useState<{ id: string; label: string }[]>([]);
  const [addingTopic, setAddingTopic] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);
  const hasMaterials = materials.length > 0 || notes.trim().length > 0;
  const allTopics = [...PRESET_TOPICS, ...customTopics.map(c => c.label)];
  useEffect(() => { if (addingTopic) customInputRef.current?.focus(); }, [addingTopic]);
  function confirmCustomTopic() {
    const label = customInput.trim();
    if (!label) { setAddingTopic(false); return; }
    const id = uid();
    setCustomTopics(prev => [...prev, { id, label }]);
    setTopic(label);
    setCustomInput("");
    setAddingTopic(false);
  }
  function removeCustomTopic(id: string, label: string) {
    setCustomTopics(prev => prev.filter(c => c.id !== id));
    if (topic === label) setTopic("Mixed");
  }
  function toggleType(t: QType) {
    if (selectedTypes.includes(t)) { if (selectedTypes.length === 1) return; setSelectedTypes(selectedTypes.filter(x => x !== t)); } else setSelectedTypes([...selectedTypes, t]);
  }
  const canStart = selectedTypes.length > 0;
  return <FadeScreen>
    <div className="px-6 md:px-10 pt-10 pb-8">
      <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-3">What would you like<br /><span className="text-primary">to study today?</span> 🎓</h1>
      <p className="text-muted-foreground text-base max-w-lg leading-relaxed">Upload your study materials, customize your quiz, and let AI generate personalized questions based on your learning goals.</p>
    </div>
    <div className="flex-1 px-6 md:px-10 pb-10 space-y-6">
      <MaterialsPanel materials={materials} setMaterials={setMaterials} notes={notes} setNotes={setNotes} detectedTopic={detectedTopic} />
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionLabel step="1">Choose a Subject</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {allTopics.map(t => {
                const isCustom = !PRESET_TOPICS.includes(t);
                const customEntry = customTopics.find(c => c.label === t);
                return <button key={t} onClick={() => setTopic(t)} className={`relative flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-150 text-left group ${topic === t ? "border-primary bg-primary text-white shadow-sm shadow-primary/20" : "border-border bg-muted/40 text-foreground hover:border-primary/30 hover:bg-primary/5"}`}>
                  <span className="text-base leading-none shrink-0">{TOPIC_ICONS[t] ?? "🎯"}</span>
                  <span className="truncate flex-1">{t}</span>
                  {isCustom && customEntry && <button onClick={e => { e.stopPropagation(); removeCustomTopic(customEntry.id, t); }} className={`shrink-0 rounded-full p-0.5 transition-colors ${topic === t ? "hover:bg-white/20 text-white/70 hover:text-white" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}><X size={11} /></button>}
                </button>;
              })}
              {addingTopic ? <div className="col-span-2 flex gap-2">
                <input ref={customInputRef} type="text" value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") confirmCustomTopic(); if (e.key === "Escape") { setAddingTopic(false); setCustomInput(""); } }} placeholder="e.g. Astronomy, Economics…" className="flex-1 bg-card border border-primary/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                <button onClick={confirmCustomTopic} className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">Add</button>
                <button onClick={() => { setAddingTopic(false); setCustomInput(""); }} className="bg-muted text-muted-foreground rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted/80 transition-colors"><X size={14} /></button>
              </div> : <button onClick={() => setAddingTopic(true)} className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-all duration-150"><Plus size={14} /> Add Subject</button>}
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionLabel step="2">Difficulty Level</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {DIFF_CONFIG.map(({ value, label, activeBg, activeText, bg, color }) => <button key={value} onClick={() => setDiff(diff === value ? "all" : value)} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold border transition-all duration-150 ${diff === value ? `${activeBg} ${activeText} border-transparent shadow-sm` : `${bg} ${color} border-transparent hover:opacity-80`}`}>{diff === value && <Check size={14} strokeWidth={2.5} />}{label}</button>)}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-5">
            <SectionLabel step="3">Number of Questions</SectionLabel>
            <div className="flex gap-2">{COUNTS.map(n => <button key={n} onClick={() => setQCount(n)} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-150 ${qCount === n ? "bg-primary text-white border-transparent shadow-sm shadow-primary/20" : "bg-muted/40 text-foreground border-border hover:border-primary/30 hover:bg-primary/5"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{n}</button>)}</div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3"><SectionLabel step="4">Question Types</SectionLabel><span className="text-xs text-muted-foreground">{selectedTypes.length} of 3 selected</span></div>
            <div className="space-y-2">{TYPE_CONFIG.map(({ value, label, emoji, desc }) => {
              const active = selectedTypes.includes(value);
              const isLast = selectedTypes.length === 1 && active;
              return <button key={value} onClick={() => toggleType(value)} title={isLast ? "At least one type must be selected" : ""} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 ${active ? "border-primary/30 bg-primary/8 ring-1 ring-primary/20" : "border-border bg-muted/30 hover:border-primary/20 hover:bg-primary/5"} ${isLast ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`} style={active ? { background: "rgb(124 58 237 / 0.06)" } : {}}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors ${active ? "bg-primary/15" : "bg-muted"}`}>{emoji}</div>
                <div className="flex-1 min-w-0"><p className={`text-sm font-semibold leading-none mb-1 ${active ? "text-primary" : "text-foreground"}`}>{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${active ? "border-primary bg-primary" : "border-border bg-transparent"}`}>{active && <Check size={11} className="text-white" strokeWidth={3} />}</div>
              </button>;
            })}</div>
            {selectedTypes.length === 0 && <p className="text-xs text-destructive mt-2 text-center">Select at least one question type</p>}
          </div>
          <button onClick={onStart} disabled={!canStart} className="w-full bg-primary text-white rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"><Zap size={18} />{hasMaterials ? "Generate Quiz from My Materials" : "Generate Quiz"}</button>
        </div>
      </div>
    </div>
  </FadeScreen>;
}

function GeneratingScreen({ step, topic, hasMaterials, materialCount, diff, selectedTypes }: { step: number; topic: string; hasMaterials: boolean; materialCount: number; diff: DiffFilter; selectedTypes: QType[]; }) {
  const steps = hasMaterials ? GEN_STEPS_MATERIALS : GEN_STEPS_DEFAULT;
  const diffLabel = diff === "all" ? "All Levels" : diff.charAt(0).toUpperCase() + diff.slice(1);
  return <FadeScreen>
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
      <div className="text-center">
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
          <motion.div className="absolute inset-0 rounded-full border-2 border-primary opacity-20" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
          <motion.div className="absolute inset-3 rounded-full border border-primary opacity-50" animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center"><Brain className="text-white" size={28} /></div>
        </div>
        <h2 className="text-2xl font-extrabold text-foreground mb-2">{hasMaterials ? "Tailoring your quiz..." : "Building your quiz..."}</h2>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">{TOPIC_ICONS[topic] ?? "🎯"} {topic}</span>
          <span className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">{diffLabel}</span>
          {hasMaterials && <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">{materialCount} source{materialCount !== 1 ? "s" : ""}</span>}
        </div>
      </div>
      <div className="w-full max-w-sm space-y-3">{steps.map((s, i) => <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${i <= step ? "opacity-100" : "opacity-25"}`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${i < step ? "bg-primary" : i === step ? "border-2 border-primary bg-primary/10" : "border-2 border-border bg-transparent"}`}>
          {i < step && <Check size={12} className="text-white" strokeWidth={3} />}
          {i === step && <motion.div className="w-2 h-2 rounded-full bg-primary" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />}
        </div>
        <span className={`text-sm ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
      </div>)}</div>
    </div>
  </FadeScreen>;
}

function QuizScreen({ q, idx, total, selected, setSelected, submitted, onSubmit, onNext, answers, gradingResult, hint, isHintLoading, onHint }: {
  q: Question; idx: number; total: number; selected: string; setSelected: (s: string) => void;
  submitted: boolean; onSubmit: () => void; onNext: () => void; answers: Answer[]; gradingResult: GradingResult | null;
  hint: string | null; isHintLoading: boolean; onHint: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isCorrect = submitted && gradingResult ? gradingResult.correct : false;
  const isLast = idx === total - 1;
  const progress = ((idx + (submitted ? 1 : 0)) / total) * 100;
  useEffect(() => { if (q.type === "sa" && textRef.current && !submitted) textRef.current.focus(); }, [q.id, submitted]);
  const diffBadge: Record<Diff, string> = { easy: "bg-emerald-50 text-emerald-600", medium: "bg-amber-50 text-amber-600", hard: "bg-rose-50 text-rose-600" };
  return <FadeScreen>
    <div className="bg-card border-b border-border px-6 md:px-10 py-4 flex items-center gap-4">
      <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center"><Brain size={14} className="text-white" /></div><span className="text-sm font-bold text-foreground">QuizD</span></div>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} /></div>
      <span className="text-sm font-semibold text-muted-foreground shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{idx + 1}/{total}</span>
    </div>
    <div className="flex-1 flex flex-col md:flex-row">
      <div className="flex-1 px-6 md:px-10 py-8 flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffBadge[q.diff]}`}>{q.diff.charAt(0).toUpperCase() + q.diff.slice(1)}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{q.topic}</span>
            <span className="text-xs font-medium text-muted-foreground">{q.type === "mc" ? "Multiple Choice" : q.type === "tf" ? "True / False" : "Short Answer"}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground leading-snug">{q.question}</h2>
        </div>
        {(q.type === "mc" || q.type === "tf") && <div className="space-y-2.5">{q.options!.map(opt => {
          const isSel = selected === opt;
          const isAns = opt === q.answer;
          let cls = "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5";
          if (submitted) { if (isAns) cls = "border-emerald-300 bg-emerald-50 text-emerald-700"; else if (isSel) cls = "border-rose-300 bg-rose-50 text-rose-700"; else cls = "border-border bg-muted/30 text-muted-foreground opacity-50"; }
          else if (isSel) cls = "border-primary bg-primary/8 text-primary ring-1 ring-primary/20";
          return <button key={opt} disabled={submitted} onClick={() => setSelected(opt)} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-150 text-left disabled:cursor-default ${cls}`} style={isSel && !submitted ? { background: "rgb(124 58 237 / 0.06)" } : {}}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${submitted && isAns ? "border-emerald-500 bg-emerald-500" : submitted && isSel ? "border-rose-500 bg-rose-500" : isSel ? "border-primary bg-primary" : "border-border"}`}>
              {((submitted && isAns) || (!submitted && isSel)) && <div className={`w-2 h-2 rounded-full ${submitted && isAns ? "bg-white" : "bg-white"}`} />}
            </div>
            {opt}
          </button>;
        })}</div>}
        {q.type === "sa" && <div>
          <textarea ref={textRef} value={selected} onChange={e => !submitted && setSelected(e.target.value)} disabled={submitted} placeholder="Type your answer here…" rows={3} className={`w-full bg-card border rounded-xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none transition-colors duration-150 ${submitted ? isCorrect ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50" : "border-border focus:border-primary/40"} disabled:opacity-70 disabled:cursor-default`} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !submitted) { e.preventDefault(); onSubmit(); } }} />
          {!submitted && <p className="text-xs text-muted-foreground mt-1.5">Press Enter to submit</p>}
        </div>}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onHint} disabled={isHintLoading} className="inline-flex items-center gap-2 border border-border bg-card text-foreground rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-muted/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"><Lightbulb size={15} />{isHintLoading ? "Getting hint..." : "Hint"}</button>
          {!submitted ? <button onClick={onSubmit} disabled={!selected.trim()} className="bg-primary text-white rounded-xl px-7 py-3 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-primary/20">Submit Answer</button> : <button onClick={onNext} className="bg-primary text-white rounded-xl px-7 py-3 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex items-center gap-2 shadow-md shadow-primary/20">{isLast ? "See Results" : "Next Question"}<ChevronRight size={16} /></button>}
        </div>
        {hint && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground"><p className="font-semibold text-primary mb-1">Hint</p><p>{hint}</p></div>}
      </div>
      {submitted && gradingResult && <div style={{ animation: "slideIn 0.3s ease-out both" }} className="md:w-80 border-t md:border-t-0 md:border-l border-border bg-card flex flex-col">
        <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }`}</style>
        <div className={`px-6 py-5 border-b border-border flex items-center gap-3 ${gradingResult.correct ? "bg-emerald-50" : "bg-rose-50"}`}>
          {gradingResult.correct ? <CheckCircle2 className="text-emerald-600 shrink-0" size={22} /> : <XCircle className="text-rose-500 shrink-0" size={22} />}
          <div><p className={`font-bold text-sm ${gradingResult.correct ? "text-emerald-700" : "text-rose-700"}`}>{gradingResult.correct ? "Correct! 🎉" : "Not quite"}</p>{!gradingResult.correct && <p className="text-xs text-muted-foreground mt-0.5">Answer: <span className="text-emerald-600 font-semibold">{q.answer}</span></p>}</div>
        </div>
        <div className="px-6 py-5 flex-1"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Feedback</p><p className="text-sm text-foreground leading-relaxed">{gradingResult.feedback}</p></div>
        <div className="px-6 py-4 border-t border-border bg-muted/30"><p className="text-xs text-muted-foreground mb-1">Score so far</p><p className="text-2xl font-extrabold text-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{answers.filter(a => a.correct).length}<span className="text-muted-foreground font-normal text-base"> / {answers.length}</span></p></div>
      </div>}
    </div>
  </FadeScreen>;
}

function ResultsScreen({ questions, answers, score, pct, onRestart, onStudyAgain, onRegenerateWithRefinement, refinementPrompt, setRefinementPrompt }: {
  questions: Question[]; answers: Answer[]; score: number; pct: number; onRestart: () => void; onStudyAgain: () => void;
  onRegenerateWithRefinement: (refinement: string) => void; refinementPrompt: string; setRefinementPrompt: (s: string) => void;
}) {
  const { label, sub, emoji } = scoreLabel(pct);
  const byType = ["mc", "tf", "sa"].map(t => { const qs = questions.filter(q => q.type === t); const correct = qs.filter(q => answers.find(a => a.qid === q.id)?.correct).length; return { type: t, total: qs.length, correct }; });
  const typeLabel: Record<string, string> = { mc: "Multiple Choice", tf: "True / False", sa: "Short Answer" };
  const stats = [
    { label: "Correct", val: score, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Missed", val: questions.length - score, color: "text-rose-500", bg: "bg-rose-50" },
    { label: "Total", val: questions.length, color: "text-primary", bg: "bg-primary/10" }
  ];
  return <FadeScreen>
    <header className="flex items-center gap-3 px-6 md:px-10 py-5 bg-card border-b border-border">
      <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center"><Trophy size={16} className="text-white" /></div>
      <span className="text-sm font-bold text-foreground">Quiz Results</span>
    </header>
    <div className="flex-1 grid md:grid-cols-[1fr_360px]">
      <div className="px-6 md:px-10 py-8 flex flex-col gap-8 border-r border-border">
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <div className="text-5xl mb-2">{emoji}</div>
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 18 }}>
            <span className="text-7xl font-extrabold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pct}</span>
            <span className="text-3xl font-bold text-muted-foreground">%</span>
          </motion.div>
          <h2 className="text-xl font-extrabold text-foreground mt-2 mb-1">{label}</h2>
          <p className="text-sm text-muted-foreground">{sub}</p>
        </div>
        <div className="grid grid-cols-3 gap-3">{stats.map(({ label, val, color, bg }) => <div key={label} className={`${bg} rounded-2xl p-4 text-center`}><p className={`text-2xl font-extrabold ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{val}</p><p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p></div>)}</div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4">Performance by Type</p>
          <div className="space-y-4">{byType.filter(b => b.total > 0).map(({ type, total, correct }) => {
            const tp = Math.round((correct / total) * 100);
            return <div key={type}><div className="flex justify-between mb-1.5"><span className="text-sm text-foreground">{typeLabel[type]}</span><span className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{correct}/{total}</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><motion.div className={`h-full rounded-full ${tp >= 60 ? "bg-emerald-500" : "bg-rose-400"}`} initial={{ width: 0 }} animate={{ width: `${tp}%` }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }} /></div></div>;
          })}</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Refine & Regenerate</p>
          <div className="flex flex-col gap-2">
            <input type="text" value={refinementPrompt} onChange={e => setRefinementPrompt(e.target.value)} placeholder="e.g. Make questions harder, focus on X..." className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
            <button onClick={() => onRegenerateWithRefinement(refinementPrompt)} className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-primary/20"><RotateCcw size={15} /> Regenerate with Refinement</button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onRestart} className="flex-1 bg-primary text-white rounded-xl py-3.5 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20"><RotateCcw size={15} /> New Quiz</button>
          <button onClick={onStudyAgain} className="flex-1 border border-border bg-card text-foreground rounded-xl py-3.5 font-semibold text-sm hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"><BookOpen size={15} /> Study Again</button>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-card"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question Review</p></div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>{questions.map((q, i) => {
          const ans = answers.find(a => a.qid === q.id);
          const correct = ans?.correct ?? false;
          return <div key={q.id} className="px-6 py-4 border-b border-border hover:bg-muted/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${correct ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"}`}>{correct ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}</div>
              <div className="min-w-0 flex-1"><p className="text-sm text-foreground leading-snug mb-1 font-medium">{q.question}</p>{!correct && <p className="text-xs text-muted-foreground">Yours: <span className="text-rose-500">{ans?.given || "—"}</span> · Correct: <span className="text-emerald-600 font-medium">{q.answer}</span></p>}{correct && <p className="text-xs text-emerald-600 font-medium">{ans?.given}</p>}</div>
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{String(i + 1).padStart(2, "0")}</span>
            </div>
          </div>;
        })}</div>
      </div>
    </div>
  </FadeScreen>;
}

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
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("darkMode") === "true");

  const toggleDark = () => { const newDark = !isDark; setIsDark(newDark); localStorage.setItem("darkMode", String(newDark)); document.documentElement.classList.toggle("dark", newDark); };
  useEffect(() => { document.documentElement.classList.toggle("dark", isDark); }, [isDark]);

  const noteKeywords = extractKeywords(notes);
  const detectedTopic = notes.trim().length > 30 ? detectTopic(noteKeywords) : null;
  useEffect(() => { if (detectedTopic) setTopic(detectedTopic); }, [detectedTopic]);

  const hasMaterials = materials.length > 0 || notes.trim().length > 0;
  const materialCount = materials.length + (notes.trim() ? 1 : 0);

  const startQuiz = async (refinement?: string) => {
    setGenStep(0);
    setScreen("generating");
    const steps = hasMaterials ? GEN_STEPS_MATERIALS : GEN_STEPS_DEFAULT;
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setGenStep(step);
      if (step >= steps.length - 1) {
        clearInterval(iv);
        try {
          const payload = { topic, difficulty: diff === "all" ? "Intermediate" : diff, count: qCount, question_types: selectedTypes, ...(refinement ? { refinement_prompt: refinement } : {}) };
          fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then(res => res.json())
            .then(data => {
              if (data.status === "error") {
                console.error("Generation error:", data.error);
                toast.error(data.error || "Failed to generate questions.");
                setScreen("home");
                setGenStep(0);
                return;
              }
              const qs: Question[] = Array.isArray(data.questions) ? data.questions.map((q: any, index: number) => {
                const type = normalizeQuestionType(q.type);
                const options = Array.isArray(q.options) && q.options.length > 0 ? q.options : type === "tf" ? ["True", "False"] : undefined;
                return { id: q.id || `gen-${index}`, type, topic: data.topic || topic, diff: normalizeDifficulty(data.difficulty || q.difficulty || "easy"), question: q.question_text || q.question || "", options, answer: q.answer || q.correct_answer || "", explanation: q.explanation || "" };
              }) : [];
              if (!qs || qs.length === 0) { toast.error("No questions received. Please try again."); setScreen("home"); setGenStep(0); return; }
              console.log("API response:", data);
              console.log("Mapped questions:", qs);
              setQuestions(qs); setIdx(0); setAnswers([]); setSelected(""); setSubmitted(false); setGradingResult(null); setRefinementPrompt("");
              setTimeout(() => setScreen("quiz"), 400);
            })
            .catch(err => { console.error("API error:", err); toast.error("Network error. Please check your connection."); setScreen("home"); setGenStep(0); });
        } catch (e) { console.error("Unexpected error:", e); toast.error("An unexpected error occurred."); setScreen("home"); setGenStep(0); }
      }
    }, 500);
  };

  const submit = async () => {
    const trimmed = selected.trim();
    if (!trimmed) return;
    const q = questions[idx];
    try {
      const response = await fetch("/api/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: [{ id: q.id, question: q.question, user_answer: trimmed }] }) });
      const data = await response.json();
      if (data.status === "error") { console.error("Grading error:", data.error); const correct = q.type === "sa" ? gradeShortAnswer(trimmed, q.answer) : trimmed === q.answer; setAnswers(prev => [...prev, { qid: q.id, given: trimmed, correct }]); setGradingResult({ correct, feedback: q.explanation, pointsAwarded: correct ? 10 : 0, maxPoints: 10 }); setSubmitted(true); return; }
      const result = data.results?.[0];
      if (!result) throw new Error("No grading result");
      const correct = result.is_correct;
      setAnswers(prev => [...prev, { qid: q.id, given: trimmed, correct }]);
      setGradingResult({ correct, feedback: result.ai_feedback || q.explanation, pointsAwarded: result.points_awarded || (correct ? 10 : 0), maxPoints: result.max_points || 10 });
      setSubmitted(true);
    } catch (err) { console.error("Grading API error:", err); const correct = q.type === "sa" ? gradeShortAnswer(trimmed, q.answer) : trimmed === q.answer; setAnswers(prev => [...prev, { qid: q.id, given: trimmed, correct }]); setGradingResult({ correct, feedback: q.explanation, pointsAwarded: correct ? 10 : 0, maxPoints: 10 }); setSubmitted(true); }
  };

  const handleHint = async () => {
    const q = questions[idx];
    if (!q) return;
    setIsHintLoading(true); setHint(null);
    try {
      const response = await fetch("/api/hint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q.question, topic: q.topic, difficulty: q.diff }) });
      const data = await response.json();
      setHint(data.hint || "No hint available right now.");
    } catch (error) { console.error("Hint request failed:", error); setHint("Unable to fetch a hint right now."); } finally { setIsHintLoading(false); }
  };

  const next = () => { if (idx + 1 >= questions.length) { setScreen("results"); } else { setIdx(i => i + 1); setSelected(""); setSubmitted(false); setGradingResult(null); setHint(null); } };

  const studyAgain = () => {
    const incorrect = questions.filter(q => { const ans = answers.find(a => a.qid === q.id); return ans && !ans.correct; });
    if (incorrect.length === 0) { toast.info("You got everything right! Generating a new quiz."); startQuiz(); return; }
    const topics = [...new Set(incorrect.map(q => q.topic).filter(Boolean))];
    const diffs = [...new Set(incorrect.map(q => q.diff).filter(Boolean))];
    let refinement = "Focus on weaknesses from the previous quiz. ";
    if (topics.length > 0) refinement += `Emphasize topics: ${topics.join(", ")}. `;
    if (diffs.length > 0) refinement += `Focus on difficulty: ${diffs.join(", ")}. `;
    startQuiz(refinement.trim());
  };

  const restart = () => { setScreen("home"); setAnswers([]); setSelected(""); setSubmitted(false); setIdx(0); setQuestions([]); setGradingResult(null); setHint(null); setRefinementPrompt(""); };

  const regenerateWithRefinement = (refinement: string) => { if (!refinement.trim()) { toast.error("Please enter a refinement prompt."); return; } startQuiz(refinement.trim()); };

  const score = answers.filter(a => a.correct).length;
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const q = questions[idx];

  return <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
    <button onClick={toggleDark} className="fixed top-4 right-4 z-50 p-2 rounded-full bg-card border border-border shadow-md hover:bg-muted transition-colors" aria-label="Toggle dark mode">{isDark ? <Sun size={20} className="text-foreground" /> : <Moon size={20} className="text-foreground" />}</button>
    {screen === "home" && <HomeScreen topic={topic} setTopic={setTopic} qCount={qCount} setQCount={setQCount} onStart={() => startQuiz()} materials={materials} setMaterials={setMaterials} notes={notes} setNotes={setNotes} detectedTopic={detectedTopic} diff={diff} setDiff={setDiff} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} />}
    {screen === "generating" && <GeneratingScreen step={genStep} topic={topic} hasMaterials={hasMaterials} materialCount={materialCount} diff={diff} selectedTypes={selectedTypes} />}
    {screen === "quiz" && q && <QuizScreen q={q} idx={idx} total={questions.length} selected={selected} setSelected={setSelected} submitted={submitted} onSubmit={submit} onNext={next} answers={answers} gradingResult={gradingResult} hint={hint} isHintLoading={isHintLoading} onHint={handleHint} />}
    {screen === "results" && <ResultsScreen questions={questions} answers={answers} score={score} pct={pct} onRestart={restart} onStudyAgain={studyAgain} onRegenerateWithRefinement={regenerateWithRefinement} refinementPrompt={refinementPrompt} setRefinementPrompt={setRefinementPrompt} />}
  </div>;
}