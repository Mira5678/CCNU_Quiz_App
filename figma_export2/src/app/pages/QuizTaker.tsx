import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { Question, UserAnswer, QuizResult } from "../types/quiz";
import { quizStorage } from "../lib/storage";
import { gradeAnswer } from "../lib/mockAI";
import { toast } from "sonner";

export function QuizTaker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(quizStorage.getQuiz(id!));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  useEffect(() => {
    if (!quiz) {
      toast.error("Quiz not found");
      navigate("/");
    }
  }, [quiz, navigate]);

  if (!quiz) return null;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const currentAnswer = answers.get(currentQuestion.id);

  const handleAnswerChange = (value: string | string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, value);
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleHint = async () => {
    setIsHintLoading(true);
    setHint(null);

    try {
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          topic: currentQuestion.topic || quiz.title,
          difficulty: currentQuestion.difficulty,
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

  const handleSubmit = async () => {
    // Check if all questions are answered
    const unanswered = quiz.questions.filter(q => !answers.has(q.id));
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    setIsSubmitting(true);

    // Simulate grading delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Grade all answers
    const gradedAnswers: UserAnswer[] = quiz.questions.map(question => {
      const userAnswer = answers.get(question.id)!;
      const grading = gradeAnswer(question, userAnswer);

      return {
        questionId: question.id,
        answer: userAnswer,
        isCorrect: grading.isCorrect,
        feedback: grading.feedback
      };
    });

    const score = gradedAnswers.filter(a => a.isCorrect).length;

    const result: QuizResult = {
      quizId: quiz.id,
      answers: gradedAnswers,
      score,
      totalQuestions: quiz.questions.length,
      completedAt: new Date()
    };

    quizStorage.saveResult(result);
    
    setIsSubmitting(false);
    toast.success("Quiz submitted!");
    navigate(`/results/${quiz.id}`);
  };

  const renderQuestionInput = (question: Question) => {
    const answer = answers.get(question.id);

    switch (question.type) {
      case "multiple-choice":
      case "true-false":
      case "matching":
        return (
          <RadioGroup 
            value={answer as string || ""} 
            onValueChange={handleAnswerChange}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "fill-in-blank":
        return (
          <Input
            placeholder="Type your answer..."
            value={answer as string || ""}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="text-base"
          />
        );

      case "short-answer":
        return (
          <Textarea
            placeholder="Type your answer..."
            value={answer as string || ""}
            onChange={(e) => handleAnswerChange(e.target.value)}
            rows={5}
            className="text-base"
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="size-4 mr-2" />
              Exit Quiz
            </Button>
          </Link>
          <h1 className="text-3xl mb-2">{quiz.title}</h1>
          <p className="text-gray-600">{quiz.description}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
                <span className="font-semibold">{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentQuestion.type}</Badge>
                <Badge 
                  variant={
                    currentQuestion.difficulty === "easy" ? "default" : 
                    currentQuestion.difficulty === "medium" ? "secondary" : 
                    "destructive"
                  }
                >
                  {currentQuestion.difficulty}
                </Badge>
              </div>
              <span className="text-sm text-gray-600">
                {answers.has(currentQuestion.id) ? "✓ Answered" : "Not answered"}
              </span>
            </div>
            <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
            <CardDescription>
              {currentQuestion.type === "short-answer" 
                ? "Provide a detailed answer to this question"
                : "Select the correct answer"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleHint} disabled={isHintLoading}>
                {isHintLoading ? "Getting hint..." : "Hint"}
              </Button>
            </div>

            {hint && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-medium">Hint</p>
                <p className="mt-1">{hint}</p>
              </div>
            )}

            {renderQuestionInput(currentQuestion)}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="size-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`size-8 rounded-full text-xs font-medium transition-colors ${
                  index === currentQuestionIndex
                    ? "bg-blue-600 text-white"
                    : answers.has(quiz.questions[index].id)
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-gray-100 text-gray-600 border border-gray-300"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Submit Quiz
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
