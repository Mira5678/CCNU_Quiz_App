import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Brain, BookOpen, CheckCircle, FlaskConical, History } from "lucide-react";
import { quizStorage } from "../lib/storage";

export function Dashboard() {
  const quizzes = quizStorage.getAllQuizzes();
  const results = quizStorage.getAllResults();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="size-12 text-blue-600" />
            <h1 className="text-4xl">AI Quiz Master</h1>
          </div>
          <p className="text-gray-600">
            Generate questions, take quizzes, and validate quality with AI
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Link to="/generate">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Brain className="size-6 text-purple-600" />
                  </div>
                  <CardTitle>Generate Questions</CardTitle>
                </div>
                <CardDescription>
                  Use AI to create questions on any topic with various difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Start Generating</Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/qa-validator">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FlaskConical className="size-6 text-green-600" />
                  </div>
                  <CardTitle>QA Validator</CardTitle>
                </div>
                <CardDescription>
                  Test questions for accuracy, clarity, and appropriate difficulty
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Validate Questions</Button>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CheckCircle className="size-6 text-blue-600" />
                </div>
                <CardTitle>Statistics</CardTitle>
              </div>
              <CardDescription>
                Track your quiz performance and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Quizzes</span>
                  <span className="font-semibold">{quizzes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="font-semibold">{results.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Score</span>
                  <span className="font-semibold">
                    {results.length > 0
                      ? Math.round(
                          results.reduce((sum, r) => sum + (r.score / r.totalQuestions) * 100, 0) /
                            results.length
                        )
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quizzes */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <History className="size-6 text-gray-600" />
            <h2 className="text-2xl">Your Quizzes</h2>
          </div>

          {quizzes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="size-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No quizzes yet</p>
                <Link to="/generate">
                  <Button>Create Your First Quiz</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => {
                const result = quizStorage.getResult(quiz.id);
                
                return (
                  <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-start justify-between">
                        <span className="line-clamp-1">{quiz.title}</span>
                        {result && (
                          <span className="text-sm font-normal text-green-600 flex-shrink-0 ml-2">
                            ✓ {Math.round((result.score / result.totalQuestions) * 100)}%
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {quiz.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{quiz.questions.length} questions</span>
                        <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2">
                        {result ? (
                          <Link to={`/results/${quiz.id}`} className="flex-1">
                            <Button variant="outline" className="w-full">View Results</Button>
                          </Link>
                        ) : (
                          <Link to={`/quiz/${quiz.id}`} className="flex-1">
                            <Button className="w-full">Take Quiz</Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
