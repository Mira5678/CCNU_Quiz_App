import { createBrowserRouter } from "react-router";
import { Dashboard } from "./pages/Dashboard";
import { QuestionGenerator } from "./pages/QuestionGenerator";
import { QuizTaker } from "./pages/QuizTaker";
import { Results } from "./pages/Results";
import { QAValidator } from "./pages/QAValidator";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Dashboard,
  },
  {
    path: "/generate",
    Component: QuestionGenerator,
  },
  {
    path: "/quiz/:id",
    Component: QuizTaker,
  },
  {
    path: "/results/:id",
    Component: Results,
  },
  {
    path: "/qa-validator",
    Component: QAValidator,
  },
]);
