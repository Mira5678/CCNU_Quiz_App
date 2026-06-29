export type QuestionType = 
  | "multiple-choice"
  | "true-false"
  | "short-answer"
  | "fill-in-blank"
  | "matching";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  topic?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: Date;
}

export interface UserAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  feedback?: string;
}

export interface QuizResult {
  quizId: string;
  answers: UserAnswer[];
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

export interface QAReport {
  questionId: string;
  factualAccuracy: number; // 0-100
  clarity: number; // 0-100
  difficultyAppropriate: boolean;
  issues: string[];
  suggestions: string[];
}
