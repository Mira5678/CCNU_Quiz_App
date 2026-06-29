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

interface GradingResult {
  correct: boolean;
  feedback: string;
  pointsAwarded: number;
  maxPoints: number;
}

// ── Question Bank (local fallback) ──────────────────────────────────────────

const QB: Question[] = [
  { id: "s1", type: "mc", topic: "Science", diff: "easy", question: "What is the chemical symbol for water?", options: ["H₂O", "H₂", "O₂", "HO"], answer: "H₂O", explanation: "Water (H₂O) is composed of two hydrogen atoms covalently bonded to one oxygen atom." },
  { id: "s2", type: "tf", topic: "Science", diff: "easy", question: "The Sun is classified as a yellow dwarf star.", options: ["True", "False"], answer: "True", explanation: "Our Sun is a G-type main-sequence star — a yellow dwarf — approximately 4.6 billion years old." },
  { id: "s3", type: "mc", topic: "Science", diff: "easy", question: "Which organelle is known as the powerhouse of the cell?", options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi apparatus"], answer: "Mitochondria", explanation: "Mitochondria generate ATP through cellular respiration, supplying energy for nearly all cellular processes." },
  { id: "s4", type: "sa", topic: "Science", diff: "easy", question: "What force keeps planets in orbit around the Sun?", answer: "gravity", explanation: "Gravity is the attractive force between masses. The Sun's immense gravity keeps planets in elliptical orbits." },
  { id: "s5", type: "tf", topic: "Science", diff: "medium", question: "Neutrons carry a positive electrical charge.", options: ["True", "False"], answer: "False", explanation: "Neutrons are electrically neutral. Protons carry positive charge; electrons carry negative charge." },
  { id: "s6", type: "mc", topic: "Science", diff: "medium", question: "What is the approximate speed of light in a vacuum?", options: ["299,792 km/s", "150,000 km/s", "3,000 km/s", "1,080,000 km/h"], answer: "299,792 km/s", explanation: "Light travels at approximately 299,792 km/s in a vacuum, a universal constant denoted 'c' in physics." },
  { id: "s7", type: "sa", topic: "Science", diff: "easy", question: "What element has the atomic number 1?", answer: "hydrogen", explanation: "Hydrogen is the lightest and most abundant element in the universe, with a single proton and one electron." },
  { id: "s8", type: "mc", topic: "Science", diff: "medium", question: "Which of Newton's laws states that every action has an equal and opposite reaction?", options: ["First Law", "Second Law", "Third Law", "Law of Gravitation"], answer: "Third Law", explanation: "Newton's Third Law: when one object exerts a force on another, the second exerts an equal and opposite force back." },
  { id: "s9", type: "tf", topic: "Science", diff: "medium", question: "The human body has 206 bones in adulthood.", options: ["True", "False"], answer: "True", explanation: "Adults have 206 bones. Newborns have ~270 bones that gradually fuse as the body matures." },
  { id: "s10", type: "tf", topic: "Science", diff: "easy", question: "DNA stands for Deoxyribonucleic Acid.", options: ["True", "False"], answer: "True", explanation: "DNA (Deoxyribonucleic Acid) carries genetic instructions for all known living organisms." },
  { id: "s11", type: "mc", topic: "Science", diff: "hard", question: "What is the half-life of Carbon-14?", options: ["570 years", "5,730 years", "57,300 years", "573,000 years"], answer: "5,730 years", explanation: "Carbon-14 has a half-life of approximately 5,730 years, making it useful for radiocarbon dating." },
  { id: "s12", type: "sa", topic: "Science", diff: "medium", question: "What is the chemical formula for table salt?", answer: "NaCl", explanation: "Table salt is sodium chloride (NaCl), formed by an ionic bond between sodium (Na) and chlorine (Cl) atoms." },
  { id: "h1", type: "mc", topic: "History", diff: "easy", question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], answer: "1945", explanation: "WWII ended in 1945: Germany surrendered May 8 (V-E Day); Japan surrendered September 2 (V-J Day)." },
  { id: "h2", type: "tf", topic: "History", diff: "easy", question: "The Berlin Wall fell in 1989.", options: ["True", "False"], answer: "True", explanation: "The Berlin Wall fell on November 9, 1989, marking a pivotal moment in the end of the Cold War." },
  { id: "h3", type: "sa", topic: "History", diff: "easy", question: "Who was the first President of the United States?", answer: "George Washington", explanation: "George Washington served as the first U.S. President from 1789 to 1797, having led the Continental Army." },
  { id: "h4", type: "mc", topic: "History", diff: "easy", question: "Which ancient wonder of the world still stands today?", options: ["Great Pyramid of Giza", "Colossus of Rhodes", "Lighthouse of Alexandria", "Hanging Gardens"], answer: "Great Pyramid of Giza", explanation: "The Great Pyramid of Giza, built ~2560 BCE for Pharaoh Khufu, is the only ancient wonder still standing." },
  { id: "h5", type: "tf", topic: "History", diff: "medium", question: "Napoleon Bonaparte was born in France.", options: ["True", "False"], answer: "False", explanation: "Napoleon was born in Ajaccio, Corsica on August 15, 1769 — transferred from Genoa to France just a year before." },
  { id: "h6", type: "mc", topic: "History", diff: "medium", question: "The Magna Carta was signed in which year?", options: ["1066", "1215", "1348", "1492"], answer: "1215", explanation: "King John signed the Magna Carta at Runnymede on June 15, 1215, establishing the rule of law over the king." },
  { id: "h7", type: "sa", topic: "History", diff: "easy", question: "What empire did Julius Caesar belong to?", answer: "Roman", explanation: "Julius Caesar was a Roman general and statesman who played a critical role in events that ended the Roman Republic." },
  { id: "h8", type: "mc", topic: "History", diff: "hard", question: "Which treaty ended the Thirty Years' War in 1648?", options: ["Treaty of Versailles", "Peace of Westphalia", "Treaty of Utrecht", "Congress of Vienna"], answer: "Peace of Westphalia", explanation: "The Peace of Westphalia (1648) ended both the Thirty Years' War and Eighty Years' War and established modern state sovereignty." },
  { id: "g1", type: "mc", topic: "Geography", diff: "medium", question: "What is the capital city of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], answer: "Canberra", explanation: "Canberra has been Australia's capital since 1913, purpose-built as a compromise between Sydney and Melbourne." },
  { id: "g2", type: "tf", topic: "Geography", diff: "medium", question: "The Amazon River is the longest river in the world.", options: ["True", "False"], answer: "False", explanation: "The Nile (~6,650 km) is generally considered the longest river. The Amazon has the greatest water discharge volume." },
  { id: "g3", type: "sa", topic: "Geography", diff: "easy", question: "What is the largest country in the world by land area?", answer: "Russia", explanation: "Russia covers 17.1 million km² — roughly twice the size of Canada, the next largest country." },
  { id: "g4", type: "mc", topic: "Geography", diff: "easy", question: "Which continent is the Sahara Desert located on?", options: ["Asia", "Australia", "Africa", "South America"], answer: "Africa", explanation: "The Sahara is the world's largest hot desert, covering approximately 9.2 million km² across North Africa." },
  { id: "g5", type: "tf", topic: "Geography", diff: "medium", question: "Mount Everest is located on the border of Nepal and China.", options: ["True", "False"], answer: "True", explanation: "Everest straddles the Nepal–Tibet (China) border. Its peak at 8,849 m is the highest point on Earth." },
  { id: "g6", type: "mc", topic: "Geography", diff: "medium", question: "What is the smallest country in the world by area?", options: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"], answer: "Vatican City", explanation: "Vatican City covers just 0.44 km² and is an independent city-state enclaved within Rome, Italy." },
  { id: "g7", type: "sa", topic: "Geography", diff: "medium", question: "What is the deepest lake in the world?", answer: "Lake Baikal", explanation: "Lake Baikal in Siberia reaches a maximum depth of 1,642 m and holds ~20% of the world's unfrozen surface fresh water." },
  { id: "t1", type: "mc", topic: "Technology", diff: "easy", question: "Who co-founded Apple Inc. alongside Steve Jobs?", options: ["Bill Gates", "Steve Wozniak", "Paul Allen", "Larry Page"], answer: "Steve Wozniak", explanation: "Apple was co-founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976. Wozniak designed Apple's first computers." },
  { id: "t2", type: "tf", topic: "Technology", diff: "easy", question: "Python is a compiled programming language.", options: ["True", "False"], answer: "False", explanation: "Python is an interpreted language — code runs through an interpreter at runtime rather than being pre-compiled." },
  { id: "t3", type: "sa", topic: "Technology", diff: "easy", question: "What does HTML stand for?", answer: "HyperText Markup Language", explanation: "HTML (HyperText Markup Language) is the standard markup language for creating web pages." },
  { id: "t4", type: "mc", topic: "Technology", diff: "easy", question: "Which company developed the Android operating system?", options: ["Apple", "Microsoft", "Google", "Samsung"], answer: "Google", explanation: "Android was developed by Android Inc., acquired by Google in 2005. It is now the world's most widely used mobile OS." },
  { id: "t5", type: "tf", topic: "Technology", diff: "medium", question: "The first email was sent in 1971.", options: ["True", "False"], answer: "True", explanation: "Ray Tomlinson sent the first email in 1971 and chose @ to separate username from machine — still used today." },
  { id: "t6", type: "mc", topic: "Technology", diff: "easy", question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Power Unit", "Central Program Utility", "Core Processing Unit"], answer: "Central Processing Unit", explanation: "The CPU (Central Processing Unit) executes program instructions and performs arithmetic and logic operations." },
  { id: "t7", type: "sa", topic: "Technology", diff: "easy", question: "What programming language was created by Guido van Rossum?", answer: "Python", explanation: "Guido van Rossum created Python in the late 1980s, releasing version 1.0 in 1991. Named after Monty Python." },
  { id: "t8", type: "mc", topic: "Technology", diff: "medium", question: "What does HTTP stand for?", options: ["HyperText Transfer Protocol", "Hyperlink Text Transfer Protocol", "High Transfer Text Protocol", "HyperText Transmission Protocol"], answer: "HyperText Transfer Protocol", explanation: "HTTP (HyperText Transfer Protocol) is the foundation of data communication on the World Wide Web." },
  { id: "m1", type: "mc", topic: "Mathematics", diff: "easy", question: "What is the value of π (pi) to two decimal places?", options: ["3.12", "3.14", "3.16", "3.18"], answer: "3.14", explanation: "Pi (π) ≈ 3.14159…, an irrational number representing the ratio of a circle's circumference to its diameter." },
  { id: "m2", type: "tf", topic: "Mathematics", diff: "easy", question: "The square root of 144 is 12.", options: ["True", "False"], answer: "True", explanation: "√144 = 12, since 12 × 12 = 144. 144 is a perfect square." },
  { id: "m3", type: "sa", topic: "Mathematics", diff: "easy", question: "What is 15% of 200?", answer: "30", explanation: "15% of 200 = 0.15 × 200 = 30. Alternatively: 10% (20) + 5% (10) = 30." },
  { id: "m4", type: "mc", topic: "Mathematics", diff: "easy", question: "What is the sum of interior angles in any triangle?", options: ["90°", "180°", "270°", "360°"], answer: "180°", explanation: "The three interior angles of any Euclidean triangle always sum to exactly 180°." },
  { id: "m5", type: "tf", topic: "Mathematics", diff: "easy", question: "A prime number is only divisible by 1 and itself.", options: ["True", "False"], answer: "True", explanation: "A prime number has exactly two distinct natural number divisors: 1 and itself." },
  { id: "m6", type: "mc", topic: "Mathematics", diff: "medium", question: "In the Fibonacci sequence, each number is…", options: ["Twice the previous", "The sum of the two preceding numbers", "The square of its position", "The product of all preceding"], answer: "The sum of the two preceding numbers", explanation: "The Fibonacci sequence (0, 1, 1, 2, 3, 5, 8, 13…) has each term equal to the sum of the two before it." },
  { id: "m7", type: "sa", topic: "Mathematics", diff: "medium", question: "What is the area of a circle with radius 5? (Use π ≈ 3.14)", answer: "78.5", explanation: "Area = π × r² = 3.14 × 25 = 78.5 square units." },
  { id: "l1", type: "mc", topic: "Literature", diff: "easy", question: "Who wrote the dystopian novel '1984'?", options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Philip K. Dick"], answer: "George Orwell", explanation: "George Orwell published '1984' in 1949, introducing concepts like Big Brother and doublethink." },
  { id: "l2", type: "tf", topic: "Literature", diff: "medium", question: "Shakespeare wrote exactly 37 plays.", options: ["True", "False"], answer: "True", explanation: "The Shakespeare canon consists of 37 plays, 154 sonnets, and several longer poems." },
  { id: "l3", type: "sa", topic: "Literature", diff: "hard", question: "In Dostoevsky's 'Crime and Punishment,' which city does the story take place in?", answer: "St. Petersburg", explanation: "Dostoevsky set 'Crime and Punishment' (1866) in St. Petersburg. The oppressive city mirrors Raskolnikov's psychology." },
  { id: "l4", type: "mc", topic: "Literature", diff: "easy", question: "In 'Moby-Dick,' what is the white whale's name?", options: ["Moby", "Dick", "Moby Dick", "The Leviathan"], answer: "Moby Dick", explanation: "Moby Dick is the great white sperm whale in Herman Melville's 1851 novel, obsessively hunted by Captain Ahab." },
  { id: "l5", type: "tf", topic: "Literature", diff: "hard", question: "Jane Austen published 'Pride and Prejudice' under her own name.", options: ["True", "False"], answer: "False", explanation: "'Pride and Prejudice' (1813) was published anonymously as 'By the Author of Sense and Sensibility.'" },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_TOPICS = ["Mixed", "Science", "History", "Geography", "Technology", "Mathematics", "Literature"];
const TOPIC_ICONS: Record<string, string> = {
  Mixed: "⚡", Science: "🔬", History: "🏛️", Geography: "🌍",
  Technology: "💻", Mathematics: "📐", Literature: "📖",
};
const COUNTS = [5, 7, 10, 15];

const DIFF_CONFIG: { value: DiffFilter; label: string; color: string; bg: string; activeBg: string; activeText: string }[] = [
  { value: "easy",   label: "Easy",   color: "text-emerald-600", bg: "bg-emerald-50", activeBg: "bg-emerald-500", activeText: "text-white" },
  { value: "medium", label: "Medium", color: "text-amber-600",   bg: "bg-amber-50",   activeBg: "bg-amber-500",   activeText: "text-white" },
  { value: "hard",   label: "Hard",   color: "text-rose-600",    bg: "bg-rose-50",    activeBg: "bg-rose-500",    activeText: "text-white" },
];

const TYPE_CONFIG: { value: QType; label: string; emoji: string; desc: string }[] = [
  { value: "mc", label: "Multiple Choice", emoji: "🔘", desc: "4 options to choose from" },
  { value: "tf", label: "True / False",    emoji: "⚖️", desc: "Evaluate the statement" },
  { value: "sa", label: "Short Answer",    emoji: "✏️", desc: "Type your own answer" },
];

const GEN_STEPS_MATERIALS = [
  "Parsing study materials...", "Extracting key concepts...",
  "Selecting question types...", "Generating questions...", "Verifying accuracy...",
];

const GEN_STEPS_DEFAULT = [
  "Choosing your topic...", "Selecting question types...",
  "Generating questions...", "Verifying accuracy...", "Almost ready...",
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  Science: ["biology", "chemistry", "physics", "atom", "molecule", "cell", "dna", "gene", "force", "energy", "element", "compound", "reaction", "photosynthesis", "evolution", "gravity", "quantum", "electron", "nucleus", "protein", "enzyme", "newton", "orbit", "radiation"],
  History: ["war", "century", "empire", "king", "queen", "president", "revolution", "ancient", "medieval", "civilization", "treaty", "battle", "dynasty", "colonial", "independence", "rome", "greece", "egypt", "renaissance", "industrial", "napoleon", "caesar"],
  Geography: ["country", "continent", "ocean", "mountain", "river", "capital", "climate", "population", "border", "latitude", "longitude", "region", "island", "desert", "valley", "equator", "hemisphere", "biome", "topography"],
  Technology: ["computer", "software", "hardware", "internet", "algorithm", "programming", "code", "data", "network", "digital", "artificial", "machine", "learning", "database", "html", "python", "javascript", "cpu", "binary", "encryption", "protocol", "server", "cloud"],
  Mathematics: ["equation", "formula", "theorem", "number", "calculus", "algebra", "geometry", "statistics", "probability", "function", "matrix", "vector", "integer", "fraction", "polynomial", "derivative", "integral", "prime", "logarithm", "trigonometry"],
  Literature: ["novel", "poem", "author", "character", "plot", "theme", "metaphor", "narrative", "fiction", "poetry", "prose", "genre", "protagonist", "antagonist", "shakespeare", "dickens", "austen", "orwell", "symbolism", "allegory"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectUrlKind(url: string): UrlKind {
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/\.pdf($|\?)/i.test(url)) return "pdf";
  return "website";
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function extractKeywords(text: string): string[] {
  const stop = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "was", "one", "had", "has", "been", "have", "will", "with", "this", "that", "they", "from", "what", "when", "where", "how", "its", "into", "than", "some", "also", "each", "more", "about", "these", "those"]);
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !stop.has(w)))];
}

function detectTopic(keywords: string[]): string | null {
  const scores: Record<string, number> = {};
  for (const [topic, kws] of Object.entries(TOPIC_KEYWORDS)) {
    scores[topic] = keywords.filter((k) => kws.some((tk) => tk.includes(k) || k.includes(tk))).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : null;
}

function scoreQuestion(q: Question, keywords: string[]): number {
  const hay = [q.question, ...(q.options ?? []), q.answer, q.explanation].join(" ").toLowerCase();
  return keywords.reduce((n, kw) => n + (hay.includes(kw) ? 1 : 0), 0);
}

function gradeShortAnswer(given: string, answer: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const g = norm(given), a = norm(answer);
  if (!g) return false;
  if (g === a || g.includes(a) || a.includes(g)) return true;
  const kws = a.split(" ").filter((w) => w.length > 3);
  if (kws.length === 0) return false;
  return kws.filter((k) => g.includes(k)).length / kws.length >= 0.6;
}

function pickQuestions(
  topic: string, count: number, keywords: string[],
  diff: DiffFilter, types: QType[]
): Question[] {
  const isCustom = !PRESET_TOPICS.includes(topic);
  let pool = isCustom ? QB : topic === "Mixed" ? QB : QB.filter((q) => q.topic === topic);
  if (diff !== "all") pool = pool.filter((q) => q.diff === diff);
  if (types.length > 0) pool = pool.filter((q) => types.includes(q.type));
  if (pool.length < 3) {
    pool = QB.filter((q) => types.length === 0 || types.includes(q.type));
  }

  const kws = isCustom ? [...keywords, ...topic.toLowerCase().split(" ")] : keywords;
  if (kws.length > 0) {
    return [...pool].map((q) => ({ q, s: scoreQuestion(q, kws) }))
      .sort((a, b) => b.s - a.s || Math.random() - 0.5)
      .slice(0, count).map((x) => x.q);
  }
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

function scoreLabel(pct: number): { label: string; sub: string; emoji: string } {
  if (pct === 100) return { label: "Perfect Score!", sub: "Absolutely flawless. Impressive.", emoji: "🏆" };
  if (pct >= 85) return { label: "Outstanding!", sub: "You have a strong command of this material.", emoji: "🌟" };
  if (pct >= 70) return { label: "Well Done!", sub: "Solid performance — keep building on this.", emoji: "👏" };
  if (pct >= 55) return { label: "Good Effort", sub: "You're getting there. Review the misses.", emoji: "💪" };
  if (pct >= 40) return { label: "Keep Practicing", sub: "Check the explanations to improve.", emoji: "📚" };
  return { label: "Keep Studying", sub: "Everyone starts somewhere. Review and retry.", emoji: "🌱" };
}

// ── FadeScreen ────────────────────────────────────────────────────────────────

function FadeScreen({ children }: { children: ReactNode }) {
  return (
    <div style={{ animation: "fadeUp 0.28s ease-out both" }} className="min-h-screen flex flex-col">
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`}</style>
      {children}
    </div>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ step, children }: { step: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>{step}</span>
      <span className="text-sm font-semibold text-foreground">{children}</span>
    </div>
  );
}

// ── MaterialsPanel ────────────────────────────────────────────────────────────

function MaterialsPanel({
  materials, setMaterials, notes, setNotes, detectedTopic,
}: {
  materials: StudyMaterial[];
  setMaterials: (m: StudyMaterial[]) => void;
  notes: string;
  setNotes: (s: string) => void;
  detectedTopic: string | null;
}) {
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
    const ytId = urlKind === "youtube" ? (getYouTubeId(url) ?? undefined) : undefined;
    setMaterials([...materials, { id: uid(), urlKind, url, domain: getDomain(url), youtubeId: ytId }]);
    setUrlInput(""); setUrlError("");
  }

  const kindIcon = (k: UrlKind) =>
    k === "youtube" ? <Youtube size={13} className="text-rose-500" /> :
    k === "pdf" ? <FileText size={13} className="text-amber-500" /> :
    <Globe size={13} className="text-primary" />;

  const kindBadgeColor = (k: UrlKind) =>
    k === "youtube" ? "bg-rose-50 text-rose-600" :
    k === "pdf" ? "bg-amber-50 text-amber-600" :
    "bg-primary/10 text-primary";

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors duration-150">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen size={15} className="text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground leading-none mb-0.5">Study Materials</p>
            <p className="text-xs text-muted-foreground">
              {totalItems > 0 ? `${totalItems} source${totalItems !== 1 ? "s" : ""} added` : "Add websites, PDFs, YouTube videos, or notes"}
            </p>
          </div>
          {totalItems > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full ml-1">
              {totalItems}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-5 space-y-4 bg-muted/20">
          <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/15 rounded-xl px-4 py-3">
            <Lightbulb size={14} className="text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add source URLs for reference, then paste text or notes below — the quiz engine uses your pasted content to find the most relevant questions.
            </p>
          </div>

          {/* URL input */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Add a Source URL</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") addUrl(); }}
                  placeholder="Paste a YouTube, Wikipedia, PDF, or any URL…"
                  className="w-full bg-card border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors" />
              </div>
              <button onClick={addUrl}
                className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0">
                <Plus size={14} /> Add
              </button>
            </div>
            {urlError && <p className="text-xs text-destructive mt-1.5">{urlError}</p>}
          </div>

          {/* URL list */}
          {materials.length > 0 && (
            <div className="space-y-2">
              {materials.map((m) => (
                <div key={m.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
                  {m.urlKind === "youtube" && m.youtubeId ? (
                    <img src={`https://img.youtube.com/vi/${m.youtubeId}/default.jpg`}
                      alt="" className="w-14 h-10 object-cover rounded-lg shrink-0 bg-muted" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {kindIcon(m.urlKind)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block mb-0.5 ${kindBadgeColor(m.urlKind)}`}>
                      {m.urlKind.toUpperCase()}
                    </span>
                    <a href={m.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-foreground truncate block hover:text-primary transition-colors">
                      {m.domain}
                    </a>
                  </div>
                  <button onClick={() => setMaterials(materials.filter((x) => x.id !== m.id))}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notes textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Paste Notes or Key Content</p>
              {notes.trim().length > 0 && detectedTopic && (
                <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                  <Sparkles size={11} className="text-primary" />
                  <span className="text-xs text-primary font-semibold">Detected: {detectedTopic}</span>
                </div>
              )}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste your textbook chapter, lecture notes, article, or transcript here…"
              rows={5}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors resize-none leading-relaxed" />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-muted-foreground">Analysed locally — nothing leaves your browser.</p>
              <span className="text-xs text-muted-foreground">{notes.length} chars</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HomeScreen ────────────────────────────────────────────────────────────────

function HomeScreen({
  topic, setTopic, qCount, setQCount, onStart,
  materials, setMaterials, notes, setNotes, detectedTopic,
  diff, setDiff, selectedTypes, setSelectedTypes,
}: {
  topic: string; setTopic: (t: string) => void;
  qCount: number; setQCount: (n: number) => void;
  onStart: () => void;
  materials: StudyMaterial[]; setMaterials: (m: StudyMaterial[]) => void;
  notes: string; setNotes: (s: string) => void;
  detectedTopic: string | null;
  diff: DiffFilter; setDiff: (d: DiffFilter) => void;
  selectedTypes: QType[]; setSelectedTypes: (t: QType[]) => void;
}) {
  const [customTopics, setCustomTopics] = useState<{ id: string; label: string }[]>([]);
  const [addingTopic, setAddingTopic] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);
  const hasMaterials = materials.length > 0 || notes.trim().length > 0;
  const allTopics = [...PRESET_TOPICS, ...customTopics.map((c) => c.label)];

  useEffect(() => {
    if (addingTopic) customInputRef.current?.focus();
  }, [addingTopic]);

  function confirmCustomTopic() {
    const label = customInput.trim();
    if (!label) { setAddingTopic(false); return; }
    const id = uid();
    setCustomTopics((prev) => [...prev, { id, label }]);
    setTopic(label);
    setCustomInput("");
    setAddingTopic(false);
  }

  function removeCustomTopic(id: string, label: string) {
    setCustomTopics((prev) => prev.filter((c) => c.id !== id));
    if (topic === label) setTopic("Mixed");
  }

  function toggleType(t: QType) {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length === 1) return;
      setSelectedTypes(selectedTypes.filter((x) => x !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  }

  const canStart = selectedTypes.length > 0;

  return (
    <FadeScreen>
      {/* Hero */}
      <div className="px-6 md:px-10 pt-10 pb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-3">
          What would you like<br />
          <span className="text-primary">to study today?</span> 🎓
        </h1>
        <p className="text-muted-foreground text-base max-w-lg leading-relaxed">
          Add your study materials, customise your quiz settings, and get questions tailored to what you are learning.
        </p>
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 md:px-10 pb-10 space-y-6">

        {/* Materials */}
        <MaterialsPanel materials={materials} setMaterials={setMaterials}
          notes={notes} setNotes={setNotes} detectedTopic={detectedTopic} />

        <div className="grid md:grid-cols-2 gap-6">
          {/* LEFT column */}
          <div className="space-y-6">

            {/* Topic */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <SectionLabel step="1">Choose a Subject</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {allTopics.map((t) => {
                  const isCustom = !PRESET_TOPICS.includes(t);
                  const customEntry = customTopics.find((c) => c.label === t);
                  return (
                    <button key={t} onClick={() => setTopic(t)}
                      className={`relative flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all duration-150 text-left group ${
                        topic === t
                          ? "border-primary bg-primary text-white shadow-sm shadow-primary/20"
                          : "border-border bg-muted/40 text-foreground hover:border-primary/30 hover:bg-primary/5"
                      }`}>
                      <span className="text-base leading-none shrink-0">
                        {TOPIC_ICONS[t] ?? "🎯"}
                      </span>
                      <span className="truncate flex-1">{t}</span>
                      {isCustom && customEntry && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeCustomTopic(customEntry.id, t); }}
                          className={`shrink-0 rounded-full p-0.5 transition-colors ${topic === t ? "hover:bg-white/20 text-white/70 hover:text-white" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"}`}>
                          <X size={11} />
                        </button>
                      )}
                    </button>
                  );
                })}

                {/* Add custom topic */}
                {addingTopic ? (
                  <div className="col-span-2 flex gap-2">
                    <input ref={customInputRef} type="text" value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmCustomTopic(); if (e.key === "Escape") { setAddingTopic(false); setCustomInput(""); } }}
                      placeholder="e.g. Astronomy, Economics…"
                      className="flex-1 bg-card border border-primary/40 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors" />
                    <button onClick={confirmCustomTopic}
                      className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
                      Add
                    </button>
                    <button onClick={() => { setAddingTopic(false); setCustomInput(""); }}
                      className="bg-muted text-muted-foreground rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted/80 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTopic(true)}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl border border-dashed border-primary/30 text-sm font-medium text-primary hover:bg-primary/5 hover:border-primary/50 transition-all duration-150">
                    <Plus size={14} />
                    Add Subject
                  </button>
                )}
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <SectionLabel step="2">Difficulty Level</SectionLabel>
              <div className="grid grid-cols-3 gap-2">
                {DIFF_CONFIG.map(({ value, label, activeBg, activeText, bg, color }) => (
                  <button key={value} onClick={() => setDiff(diff === value ? "all" : value)}
                    className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                      diff === value
                        ? `${activeBg} ${activeText} border-transparent shadow-sm`
                        : `${bg} ${color} border-transparent hover:opacity-80`
                    }`}>
                    {diff === value && <Check size={14} strokeWidth={2.5} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="space-y-6">

            {/* Question count */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <SectionLabel step="3">Number of Questions</SectionLabel>
              <div className="flex gap-2">
                {COUNTS.map((n) => (
                  <button key={n} onClick={() => setQCount(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-150 ${
                      qCount === n
                        ? "bg-primary text-white border-transparent shadow-sm shadow-primary/20"
                        : "bg-muted/40 text-foreground border-border hover:border-primary/30 hover:bg-primary/5"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Question types — clickable */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel step="4">Question Types</SectionLabel>
                <span className="text-xs text-muted-foreground">
                  {selectedTypes.length} of 3 selected
                </span>
              </div>
              <div className="space-y-2">
                {TYPE_CONFIG.map(({ value, label, emoji, desc }) => {
                  const active = selectedTypes.includes(value);
                  const isLast = selectedTypes.length === 1 && active;
                  return (
                    <button key={value} onClick={() => toggleType(value)}
                      title={isLast ? "At least one type must be selected" : ""}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 ${
                        active
                          ? "border-primary/30 bg-primary/8 ring-1 ring-primary/20"
                          : "border-border bg-muted/30 hover:border-primary/20 hover:bg-primary/5"
                      } ${isLast ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      style={active ? { background: "rgb(124 58 237 / 0.06)" } : {}}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors ${
                        active ? "bg-primary/15" : "bg-muted"
                      }`}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-none mb-1 ${active ? "text-primary" : "text-foreground"}`}>
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
                        active ? "border-primary bg-primary" : "border-border bg-transparent"
                      }`}>
                        {active && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedTypes.length === 0 && (
                <p className="text-xs text-destructive mt-2 text-center">Select at least one question type</p>
              )}
            </div>

            {/* Start button */}
            <button onClick={onStart} disabled={!canStart}
              className="w-full bg-primary text-white rounded-2xl py-4 text-base font-bold flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed">
              <Zap size={18} />
              {hasMaterials ? "Generate Quiz from My Materials" : "Generate Quiz"}
            </button>
          </div>
        </div>
      </div>
    </FadeScreen>
  );
}

// ── GeneratingScreen ──────────────────────────────────────────────────────────

function GeneratingScreen({
  step, topic, hasMaterials, materialCount, diff, selectedTypes,
}: {
  step: number; topic: string; hasMaterials: boolean; materialCount: number;
  diff: DiffFilter; selectedTypes: QType[];
}) {
  const steps = hasMaterials ? GEN_STEPS_MATERIALS : GEN_STEPS_DEFAULT;
  const diffLabel = diff === "all" ? "All Levels" : diff.charAt(0).toUpperCase() + diff.slice(1);

  return (
    <FadeScreen>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-10">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-6">
            <motion.div className="absolute inset-0 rounded-full border-2 border-primary opacity-20"
              animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
            <motion.div className="absolute inset-3 rounded-full border border-primary opacity-50"
              animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <Brain className="text-white" size={28} />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-2">
            {hasMaterials ? "Tailoring your quiz..." : "Building your quiz..."}
          </h2>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full">
              {TOPIC_ICONS[topic] ?? "🎯"} {topic}
            </span>
            <span className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-full">
              {diffLabel}
            </span>
            {hasMaterials && (
              <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">
                {materialCount} source{materialCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${i <= step ? "opacity-100" : "opacity-25"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                i < step ? "bg-primary" : i === step ? "border-2 border-primary bg-primary/10" : "border-2 border-border bg-transparent"
              }`}>
                {i < step && <Check size={12} className="text-white" strokeWidth={3} />}
                {i === step && (
                  <motion.div className="w-2 h-2 rounded-full bg-primary"
                    animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
                )}
              </div>
              <span className={`text-sm ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </FadeScreen>
  );
}

// ── QuizScreen ──────────────────────────────────────────────────────────────

function QuizScreen({
  q, idx, total, selected, setSelected,
  submitted, onSubmit, onNext, answers,
  gradingResult, hint, isHintLoading, onHint,
}: {
  q: Question; idx: number; total: number;
  selected: string; setSelected: (s: string) => void;
  submitted: boolean; onSubmit: () => void; onNext: () => void;
  answers: Answer[];
  gradingResult: GradingResult | null;
  hint: string | null;
  isHintLoading: boolean;
  onHint: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
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

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={onHint} disabled={isHintLoading}
              className="inline-flex items-center gap-2 border border-border bg-card text-foreground rounded-xl px-4 py-2.5 font-semibold text-sm hover:bg-muted/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              <Lightbulb size={15} />
              {isHintLoading ? "Getting hint..." : "Hint"}
            </button>
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

          {hint && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
              <p className="font-semibold text-primary mb-1">Hint</p>
              <p>{hint}</p>
            </div>
          )}
        </div>

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

// ── ResultsScreen ─────────────────────────────────────────────────────────────

function ResultsScreen({
  questions, answers, score, pct, onRestart,
}: {
  questions: Question[]; answers: Answer[];
  score: number; pct: number; onRestart: () => void;
}) {
  const { label, sub, emoji } = scoreLabel(pct);
  const byType = ["mc", "tf", "sa"].map((t) => {
    const qs = questions.filter((q) => q.type === t);
    const correct = qs.filter((q) => answers.find((a) => a.qid === q.id)?.correct).length;
    return { type: t, total: qs.length, correct };
  });
  const typeLabel: Record<string, string> = { mc: "Multiple Choice", tf: "True / False", sa: "Short Answer" };
  const stats = [
    { label: "Correct", val: score, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Missed", val: questions.length - score, color: "text-rose-500", bg: "bg-rose-50" },
    { label: "Total", val: questions.length, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <FadeScreen>
      <header className="flex items-center gap-3 px-6 md:px-10 py-5 bg-card border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Trophy size={16} className="text-white" />
        </div>
        <span className="text-sm font-bold text-foreground">Quiz Results</span>
      </header>

      <div className="flex-1 grid md:grid-cols-[1fr_360px]">
        <div className="px-6 md:px-10 py-8 flex flex-col gap-8 border-r border-border">
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <div className="text-5xl mb-2">{emoji}</div>
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}>
              <span className="text-7xl font-extrabold text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {pct}
              </span>
              <span className="text-3xl font-bold text-muted-foreground">%</span>
            </motion.div>
            <h2 className="text-xl font-extrabold text-foreground mt-2 mb-1">{label}</h2>
            <p className="text-sm text-muted-foreground">{sub}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map(({ label, val, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                <p className={`text-2xl font-extrabold ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{val}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm font-semibold text-foreground mb-4">Performance by Type</p>
            <div className="space-y-4">
              {byType.filter((b) => b.total > 0).map(({ type, total, correct }) => {
                const tp = Math.round((correct / total) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-foreground">{typeLabel[type]}</span>
                      <span className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {correct}/{total}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${tp >= 60 ? "bg-emerald-500" : "bg-rose-400"}`}
                        initial={{ width: 0 }} animate={{ width: `${tp}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onRestart}
              className="flex-1 bg-primary text-white rounded-xl py-3.5 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20">
              <RotateCcw size={15} /> New Quiz
            </button>
            <button onClick={onRestart}
              className="flex-1 border border-border bg-card text-foreground rounded-xl py-3.5 font-semibold text-sm hover:bg-muted/50 transition-colors flex items-center justify-center gap-2">
              <BookOpen size={15} /> Study Again
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <div className="px-6 py-4 border-b border-border bg-card">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Question Review</p>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {questions.map((q, i) => {
              const ans = answers.find((a) => a.qid === q.id);
              const correct = ans?.correct ?? false;
              return (
                <div key={q.id} className="px-6 py-4 border-b border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      correct ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-500"
                    }`}>
                      {correct ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground leading-snug mb-1 font-medium">{q.question}</p>
                      {!correct && (
                        <p className="text-xs text-muted-foreground">
                          Yours: <span className="text-rose-500">{ans?.given || "—"}</span>
                          {" · "}Correct: <span className="text-emerald-600 font-medium">{q.answer}</span>
                        </p>
                      )}
                      {correct && <p className="text-xs text-emerald-600 font-medium">{ans?.given}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </FadeScreen>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────

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
        try {
          const payload = {
            topic: topic,
            difficulty: diff === "all" ? "Intermediate" : diff,
            count: qCount,
          };
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
            .then(res => res.json())
            .then(data => {
              if (data.status === 'error') {
                console.error('Generation error:', data.error);
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
              const qs: Question[] = data.questions.map((q: any, index: number) => ({
                id: q.id || `gen-${index}`,
                type: "sa",
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

  const handleHint = async () => {
    if (!q) return;
    setIsHintLoading(true);
    setHint(null);

    try {
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          topic: q.topic,
          difficulty: q.diff,
        })
      });
      const data = await response.json();
      setHint(data.hint || 'No hint available right now.');
    } catch (error) {
      console.error('Hint request failed:', error);
      setHint('Unable to fetch a hint right now.');
    } finally {
      setIsHintLoading(false);
    }
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setScreen("results"); }
    else {
      setIdx((i) => i + 1);
      setSelected("");
      setSubmitted(false);
      setGradingResult(null);
      setHint(null);
    }
  };

  const restart = () => {
    setScreen("home"); setAnswers([]); setSelected("");
    setSubmitted(false); setIdx(0); setQuestions([]); setGradingResult(null); setHint(null);
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
          answers={answers} gradingResult={gradingResult}
          hint={hint} isHintLoading={isHintLoading} onHint={handleHint} />
      )}
      {screen === "results" && (
        <ResultsScreen questions={questions} answers={answers} score={score} pct={pct} onRestart={restart} />
      )}
    </div>
  );
}