import { Quiz, QuizResult } from "../types/quiz";

// Mock local storage for quizzes and results
class QuizStorage {
  private quizzes: Map<string, Quiz> = new Map();
  private results: Map<string, QuizResult> = new Map();

  saveQuiz(quiz: Quiz): void {
    this.quizzes.set(quiz.id, quiz);
  }

  getQuiz(id: string): Quiz | undefined {
    return this.quizzes.get(id);
  }

  getAllQuizzes(): Quiz[] {
    return Array.from(this.quizzes.values());
  }

  saveResult(result: QuizResult): void {
    this.results.set(result.quizId, result);
  }

  getResult(quizId: string): QuizResult | undefined {
    return this.results.get(quizId);
  }

  getAllResults(): QuizResult[] {
    return Array.from(this.results.values());
  }
}

export const quizStorage = new QuizStorage();
