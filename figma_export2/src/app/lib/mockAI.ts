import { Question, QuestionType, DifficultyLevel, QAReport } from "../types/quiz";

// Mock AI question generation
export function generateQuestions(
  topic: string,
  count: number,
  type: QuestionType,
  difficulty: DifficultyLevel
): Question[] {
  const questions: Question[] = [];
  
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(topic, type, difficulty, i));
  }
  
  return questions;
}

function generateQuestion(
  topic: string,
  type: QuestionType,
  difficulty: DifficultyLevel,
  index: number
): Question {
  const baseId = `${topic}-${type}-${difficulty}-${index}`;
  
  switch (type) {
    case "multiple-choice":
      return {
        id: baseId,
        type,
        difficulty,
        topic,
        question: `What is an important concept in ${topic}? (Question ${index + 1})`,
        options: [
          "This is the correct answer",
          "This is an incorrect option",
          "This is another incorrect option",
          "This is also incorrect"
        ],
        correctAnswer: "This is the correct answer",
        explanation: `This is correct because it accurately represents a fundamental concept in ${topic}. The other options are common misconceptions.`
      };
      
    case "true-false":
      return {
        id: baseId,
        type,
        difficulty,
        topic,
        question: `${topic} involves complex problem-solving skills. (Question ${index + 1})`,
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: `This statement is true. ${topic} requires analytical thinking and problem-solving abilities.`
      };
      
    case "short-answer":
      return {
        id: baseId,
        type,
        difficulty,
        topic,
        question: `Explain a key principle of ${topic}. (Question ${index + 1})`,
        correctAnswer: `A key principle is that ${topic} requires systematic approach and understanding of fundamental concepts.`,
        explanation: `Good answers should mention systematic approach, fundamental concepts, and practical application.`
      };
      
    case "fill-in-blank":
      return {
        id: baseId,
        type,
        difficulty,
        topic,
        question: `${topic} is essential for _____ in modern applications. (Question ${index + 1})`,
        correctAnswer: "problem solving",
        explanation: `The correct answer is "problem solving" as it's a core application of ${topic}.`
      };
      
    case "matching":
      return {
        id: baseId,
        type,
        difficulty,
        topic,
        question: `Match the ${topic} concepts: Concept A matches with ___. (Question ${index + 1})`,
        options: ["Definition 1", "Definition 2", "Definition 3", "Definition 4"],
        correctAnswer: "Definition 1",
        explanation: `Concept A correctly pairs with Definition 1 in the context of ${topic}.`
      };
      
    default:
      return generateQuestion(topic, "multiple-choice", difficulty, index);
  }
}

// Mock AI answer grading
export function gradeAnswer(
  question: Question,
  userAnswer: string | string[]
): { isCorrect: boolean; feedback: string; score: number } {
  const userAnswerStr = Array.isArray(userAnswer) ? userAnswer.join(", ") : userAnswer;
  const correctAnswerStr = Array.isArray(question.correctAnswer) 
    ? question.correctAnswer.join(", ") 
    : question.correctAnswer;
  
  if (question.type === "short-answer") {
    // Simulate AI grading for short answers
    const similarity = calculateSimilarity(userAnswerStr.toLowerCase(), correctAnswerStr.toLowerCase());
    
    if (similarity > 0.7) {
      return {
        isCorrect: true,
        feedback: "Excellent answer! You've captured the key concepts well.",
        score: 100
      };
    } else if (similarity > 0.4) {
      return {
        isCorrect: false,
        feedback: `Partial credit. Your answer touches on some points, but consider: ${question.explanation}`,
        score: 50
      };
    } else {
      return {
        isCorrect: false,
        feedback: `Not quite. ${question.explanation}`,
        score: 0
      };
    }
  }
  
  // For other types, check exact match
  const isCorrect = userAnswerStr.toLowerCase().trim() === correctAnswerStr.toLowerCase().trim();
  
  return {
    isCorrect,
    feedback: isCorrect 
      ? `Correct! ${question.explanation || ""}` 
      : `Incorrect. The correct answer is: ${correctAnswerStr}. ${question.explanation || ""}`,
    score: isCorrect ? 100 : 0
  };
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple word overlap similarity
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Mock AI quality assurance
export function validateQuestion(question: Question): QAReport {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  let factualAccuracy = 85;
  let clarity = 80;
  let difficultyAppropriate = true;
  
  // Check question length
  if (question.question.length < 10) {
    issues.push("Question is too short and may lack context");
    clarity -= 20;
    suggestions.push("Expand the question to provide more context");
  }
  
  if (question.question.length > 200) {
    issues.push("Question is too long and may be confusing");
    clarity -= 15;
    suggestions.push("Simplify the question to improve readability");
  }
  
  // Check for vague language
  const vagueWords = ["thing", "stuff", "something", "somehow"];
  if (vagueWords.some(word => question.question.toLowerCase().includes(word))) {
    issues.push("Question contains vague language");
    clarity -= 10;
    factualAccuracy -= 10;
    suggestions.push("Replace vague terms with specific terminology");
  }
  
  // Check multiple choice options
  if (question.type === "multiple-choice" && question.options) {
    if (question.options.length < 3) {
      issues.push("Multiple choice should have at least 3 options");
      difficultyAppropriate = false;
      suggestions.push("Add more answer options to increase rigor");
    }
    
    if (question.options.some(opt => opt.length < 3)) {
      issues.push("Some options are too short");
      clarity -= 10;
      suggestions.push("Expand answer options for clarity");
    }
  }
  
  // Check difficulty alignment
  if (question.difficulty === "easy" && question.question.length > 150) {
    issues.push("Question complexity doesn't match 'easy' difficulty");
    difficultyAppropriate = false;
    suggestions.push("Simplify for easy difficulty or increase difficulty rating");
  }
  
  if (question.difficulty === "hard" && question.type === "true-false") {
    issues.push("True/False questions are rarely appropriate for 'hard' difficulty");
    difficultyAppropriate = false;
    suggestions.push("Consider using multiple-choice or short-answer for hard questions");
  }
  
  // Check explanation
  if (!question.explanation || question.explanation.length < 20) {
    issues.push("Missing or insufficient explanation");
    suggestions.push("Add detailed explanation to help learners understand the answer");
  }
  
  return {
    questionId: question.id,
    factualAccuracy: Math.max(0, Math.min(100, factualAccuracy)),
    clarity: Math.max(0, Math.min(100, clarity)),
    difficultyAppropriate,
    issues,
    suggestions
  };
}

export function generateSimilarQuestions(exampleQuestion: string, count: number): Question[] {
  // Mock generation of similar questions based on example
  const questions: Question[] = [];
  
  for (let i = 0; i < count; i++) {
    questions.push({
      id: `similar-${i}`,
      type: "multiple-choice",
      difficulty: "medium",
      question: `${exampleQuestion} (Variation ${i + 1})`,
      options: [
        "Option A - Similar to example",
        "Option B - Alternative approach",
        "Option C - Different perspective",
        "Option D - Contrasting view"
      ],
      correctAnswer: "Option A - Similar to example",
      explanation: "This follows the pattern established in your example question."
    });
  }
  
  return questions;
}
