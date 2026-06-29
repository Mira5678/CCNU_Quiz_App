import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Sparkles, Plus, Trash2, Check } from "lucide-react";
import { QuestionType, DifficultyLevel, Question, Quiz } from "../types/quiz";
import { generateQuestions, generateSimilarQuestions } from "../lib/mockAI";
import { quizStorage } from "../lib/storage";
import { toast } from "sonner";

export function QuestionGenerator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("generate");
  
  // Generate from topic
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState<QuestionType>("multiple-choice");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  
  // Generate similar questions
  const [exampleQuestion, setExampleQuestion] = useState("");
  const [similarCount, setSimilarCount] = useState(3);
  
  // Generated questions
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const questions = generateQuestions(topic, questionCount, questionType, difficulty);
    setGeneratedQuestions(questions);
    setQuizTitle(`${topic} Quiz`);
    setQuizDescription(`A ${difficulty} level quiz about ${topic} with ${questionCount} ${questionType} questions.`);
    
    setIsGenerating(false);
    toast.success(`Generated ${questions.length} questions!`);
  };

  const handleGenerateSimilar = async () => {
    if (!exampleQuestion) {
      toast.error("Please enter an example question");
      return;
    }

    setIsGenerating(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const questions = generateSimilarQuestions(exampleQuestion, similarCount);
    setGeneratedQuestions(questions);
    setQuizTitle("Similar Questions Quiz");
    setQuizDescription(`Questions generated based on your example.`);
    
    setIsGenerating(false);
    toast.success(`Generated ${questions.length} similar questions!`);
  };

  const handleSaveQuiz = () => {
    if (!quizTitle || generatedQuestions.length === 0) {
      toast.error("Please generate questions first");
      return;
    }

    const quiz: Quiz = {
      id: `quiz-${Date.now()}`,
      title: quizTitle,
      description: quizDescription,
      questions: generatedQuestions,
      createdAt: new Date(),
    };

    quizStorage.saveQuiz(quiz);
    toast.success("Quiz saved successfully!");
    navigate("/");
  };

  const removeQuestion = (id: string) => {
    setGeneratedQuestions(generatedQuestions.filter(q => q.id !== id));
    toast.success("Question removed");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="size-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="size-8 text-purple-600" />
            <h1 className="text-3xl">AI Question Generator</h1>
          </div>
          <p className="text-gray-600">
            Generate questions automatically or based on examples
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Generator Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Generate Questions</CardTitle>
              <CardDescription>
                Configure your quiz parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="generate">From Topic</TabsTrigger>
                  <TabsTrigger value="similar">From Example</TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., World History, Python Programming, Biology"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Question Type</Label>
                    <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionType)}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                        <SelectItem value="true-false">True/False</SelectItem>
                        <SelectItem value="short-answer">Short Answer</SelectItem>
                        <SelectItem value="fill-in-blank">Fill in the Blank</SelectItem>
                        <SelectItem value="matching">Matching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={(v) => setDifficulty(v as DifficultyLevel)}>
                      <SelectTrigger id="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="count">Number of Questions</Label>
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      max="20"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Questions
                      </>
                    )}
                  </Button>
                </TabsContent>

                <TabsContent value="similar" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="example">Example Question</Label>
                    <Textarea
                      id="example"
                      placeholder="Enter an example question that you want to generate similar variations of..."
                      rows={4}
                      value={exampleQuestion}
                      onChange={(e) => setExampleQuestion(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="similar-count">Number of Variations</Label>
                    <Input
                      id="similar-count"
                      type="number"
                      min="1"
                      max="10"
                      value={similarCount}
                      onChange={(e) => setSimilarCount(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <Button 
                    onClick={handleGenerateSimilar} 
                    disabled={isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <Sparkles className="size-4 mr-2" />
                        Generate Similar Questions
                      </>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Questions ({generatedQuestions.length})</CardTitle>
              <CardDescription>
                Preview and customize your quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generatedQuestions.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-title">Quiz Title</Label>
                    <Input
                      id="quiz-title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quiz-desc">Description</Label>
                    <Textarea
                      id="quiz-desc"
                      rows={2}
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {generatedQuestions.map((q, index) => (
                      <div key={q.id} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">Q{index + 1}</span>
                            <Badge variant="outline">{q.type}</Badge>
                            <Badge 
                              variant={
                                q.difficulty === "easy" ? "default" : 
                                q.difficulty === "medium" ? "secondary" : 
                                "destructive"
                              }
                            >
                              {q.difficulty}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeQuestion(q.id)}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                        <p className="text-sm">{q.question}</p>
                        {q.options && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                {opt === q.correctAnswer && (
                                  <Check className="size-3 text-green-600" />
                                )}
                                <span className={opt === q.correctAnswer ? "text-green-600 font-medium" : ""}>
                                  {opt}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleSaveQuiz} className="w-full">
                    <Plus className="size-4 mr-2" />
                    Save Quiz & Return to Dashboard
                  </Button>
                </>
              )}

              {generatedQuestions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Sparkles className="size-12 mx-auto mb-4 text-gray-400" />
                  <p>No questions generated yet</p>
                  <p className="text-sm">Configure settings and click generate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
