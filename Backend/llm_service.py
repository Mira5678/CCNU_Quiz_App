# backend/llm_service.py
import os
import json
import re
import logging
from typing import Dict, List, Any, Optional
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load .env from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Import prompts
from prompts import (
    SYSTEM_PROMPT_GENERATE,
    SYSTEM_PROMPT_GRADE,
    GENERATE_QUESTIONS_TEMPLATE,
    GRADE_ANSWERS_TEMPLATE
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeepSeekService:
    """Service class for interacting with AI APIs via OpenRouter."""

    def __init__(self, api_key: Optional[str] = None, use_free_tier: bool = True, model: Optional[str] = None):
        """
        Initialize the service.

        Args:
            api_key: API key. If None, reads from environment variable.
            use_free_tier: If True, uses OpenRouter's free tier (default)
            model: Specific model to use (overrides default)
        """
        self.use_free_tier = use_free_tier

        # CURRENT WORKING FREE MODELS ON OPENROUTER (Jan 2026)
        self.free_models = {
            "gpt_oss": "openai/gpt-oss-120b:free",  # Best overall - recommended!
            "laguna": "poolside/laguna-xs.2:free",  # Great for reasoning
            "gpt_20b": "openai/gpt-oss-20b:free",  # Very capable
            "google_gemma": "google/gemma-4-31b-it:free",  # Good all-around
            "cohere": "cohere/north-mini-code:free",  # Good for logic
        }

        # Use OpenAI GPT OSS 120B as default (best quality)
        self.default_free_model = self.free_models["gpt_20b"]

        if use_free_tier:
            self.api_key = api_key or os.getenv('OPENROUTER_API_KEY')
            if not self.api_key:
                raise ValueError("OpenRouter API key is required for free tier. Set OPENROUTER_API_KEY in .env")
            self.api_url = "https://openrouter.ai/api/v1/chat/completions"
            # Use specified model or default
            self.model = model or self.default_free_model
            logger.info("Using OpenRouter free tier with model: %s", self.model)
        else:
            # Use DeepSeek's official API (paid)
            self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY')
            if not self.api_key:
                raise ValueError("DeepSeek API key is required. Set DEEPSEEK_API_KEY in .env")
            self.api_url = "https://api.deepseek.com/v1/chat/completions"
            self.model = "deepseek-chat"
            logger.info("Using DeepSeek official API")

        self.max_retries = 3
        self.timeout = 60  # Increased for free tier

    def _call_deepseek_api(self, messages: List[Dict[str, str]],
                           temperature: float = 0.7,
                           response_format: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a call to the API with retry logic."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Add OpenRouter specific headers for free tier
        if self.use_free_tier:
            headers["HTTP-Referer"] = "http://localhost:5000"
            headers["X-Title"] = "AI Quiz Generator"

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4000,
            "stream": False
        }

        for attempt in range(self.max_retries):
            try:
                logger.info(f"Making API call (attempt {attempt + 1}) to {self.api_url}")
                logger.info(f"Using model: {self.model}")
                response = requests.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    error_msg = f"API error {response.status_code}: {response.text}"
                    logger.error(error_msg)
                    if attempt < self.max_retries - 1:
                        logger.info(f"Retrying... ({attempt + 1}/{self.max_retries})")
                        continue
                    raise Exception(error_msg)

            except requests.exceptions.RequestException as e:
                logger.error(f"Request attempt {attempt + 1} failed: {e}")
                if attempt < self.max_retries - 1:
                    logger.info(f"Retrying... ({attempt + 1}/{self.max_retries})")
                    continue
                raise Exception(f"Request failed after {self.max_retries} attempts: {str(e)}")

        raise Exception("Failed to get response from API")

    def _extract_json_from_response(self, response_content: str) -> Dict[str, Any]:
        """Extract JSON from API response."""
        # Try to find JSON in markdown code blocks
        json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        matches = re.findall(json_pattern, response_content)

        if matches:
            json_str = matches[0].strip()
        else:
            # Try to find JSON between curly braces
            brace_pattern = r'\{[\s\S]*\}'
            brace_matches = re.findall(brace_pattern, response_content)
            if brace_matches:
                json_str = brace_matches[0].strip()
            else:
                json_str = response_content.strip()

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            cleaned_json = self._clean_json_string(json_str)
            try:
                return json.loads(cleaned_json)
            except json.JSONDecodeError:
                raise ValueError(f"Failed to parse JSON response: {e}\nResponse: {response_content[:200]}...")

    def _clean_json_string(self, json_str: str) -> str:
        """Clean common JSON formatting issues."""
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)
        json_str = re.sub(r'([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', json_str)
        return json_str

    def _build_question_generation_prompt(self,
                                          topic: str,
                                          difficulty: str = "Intermediate",
                                          count: int = 5,
                                          refinement_prompt: Optional[str] = None,
                                          question_types: Optional[List[str]] = None) -> str:
        normalized_topic = (topic or "").strip()
        is_mixed = normalized_topic.lower() == "mixed"

        if is_mixed:
            topic_focus = (
                "a balanced mix of general knowledge topics across science, technology, "
                "mathematics, geography, history, and literature"
            )
            topic_label = "Mixed"
        else:
            topic_focus = normalized_topic
            topic_label = normalized_topic

        # Map to full type names for the prompt
        type_map = {
            "mc": "multiple-choice",
            "tf": "true-false",
            "sa": "short-answer"
        }
        normalized_question_types = []
        if question_types:
            for raw in question_types:
                raw = raw.strip().lower()
                if raw in type_map:
                    normalized_question_types.append(type_map[raw])
                else:
                    # try to map common variants
                    if raw in {"multiple-choice", "multiple choice"}:
                        normalized_question_types.append("multiple-choice")
                    elif raw in {"true-false", "true/false", "tf"}:
                        normalized_question_types.append("true-false")
                    elif raw in {"short-answer", "short answer", "sa"}:
                        normalized_question_types.append("short-answer")
        # If no valid types, default to all three
        if not normalized_question_types:
            normalized_question_types = ["multiple-choice", "true-false", "short-answer"]

        # Build the strict type instruction
        if len(normalized_question_types) == 1:
            type_instruction = f"You MUST ONLY generate questions of type **{normalized_question_types[0]}**. Do not include any other types."
        else:
            type_instruction = f"You MUST ONLY generate questions of the following types: {', '.join(normalized_question_types)}. Do not include any other types."

        # Common JSON structure instruction
        json_instruction = """
    For each question, include a `type` field set to one of the allowed types.
    - Multiple-choice questions must include 4 options and a clear correct answer.
    - True/false questions must include options `["True", "False"]` and a correct answer.
    - Short-answer questions should be open-ended and require a short written answer (2-3 sentences).
    - Each question must have a clear, correct answer and a brief explanation.

    If the topic is mixed/general knowledge, make sure the questions come from a variety of subjects.

    Format each question as a JSON object with fields: id, type, question_text, answer, explanation, and options where relevant.

    Return the questions as a JSON object with this structure:
    {
      "status": "success",
      "questions": [
        {"id": 1, "type": "multiple-choice", "question_text": "Question text", "answer": "Correct answer", "explanation": "Brief explanation", "options": ["A", "B", "C", "D"]}
      ]
    }

    Only return the JSON object, no other text.
    """

        if refinement_prompt:
            base = f"""
    Topic: {topic_label}
    Topic focus: {topic_focus}
    Difficulty: {difficulty}
    Number of questions: {count}
    Requested question types: {', '.join(normalized_question_types)}

    Previous questions need refinement based on this feedback:
    {refinement_prompt}

    Please generate new questions that address this feedback while maintaining the same topic, difficulty, and type constraints.
    {type_instruction}
    {json_instruction}
    """
        else:
            base = f"""
    Generate {count} high-quality questions about {topic_focus} at the {difficulty} level.

    {type_instruction}
    {json_instruction}
    """
        return base

    def generate_questions(self,
                           topic: str,
                           difficulty: str = "Intermediate",
                           count: int = 5,
                           refinement_prompt: Optional[str] = None,
                           question_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate quiz questions."""
        user_message = self._build_question_generation_prompt(
            topic=topic,
            difficulty=difficulty,
            count=count,
            refinement_prompt=refinement_prompt,
            question_types=question_types
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_GENERATE},
            {"role": "user", "content": user_message}
        ]

        try:
            response = self._call_deepseek_api(
                messages=messages,
                temperature=0.7
            )

            content = response['choices'][0]['message']['content']
            logger.info(f"Raw response: {content[:200]}...")
            result = self._extract_json_from_response(content)

            if not self._validate_questions_response(result):
                raise ValueError("Invalid questions response format")

            result['topic'] = topic
            result['difficulty'] = difficulty
            result['question_count'] = len(result.get('questions', []))
            result['generated_at'] = datetime.now().isoformat()
            result['model_used'] = self.model

            return result

        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "topic": topic,
                "difficulty": difficulty,
                "questions": []
            }

    def _validate_questions_response(self, response: Dict[str, Any]) -> bool:
        if not isinstance(response, dict):
            return False
        if 'questions' not in response:
            return False
        questions = response['questions']
        if not isinstance(questions, list) or len(questions) == 0:
            return False
        for q in questions:
            if not isinstance(q, dict):
                return False
            # Required fields: id, question_text, answer, explanation, type
            if not all(field in q for field in ['id', 'question_text', 'answer', 'explanation', 'type']):
                return False
            if not q['question_text'].strip() or not q['answer'].strip() or not q['explanation'].strip():
                return False
            # Validate type value
            q_type = q.get('type', '').lower()
            if q_type not in ['multiple-choice', 'true-false', 'short-answer']:
                return False
            # If multiple-choice or true-false, options should be present and non-empty
            if q_type in ['multiple-choice', 'true-false']:
                options = q.get('options')
                if not isinstance(options, list) or len(options) < 2:
                    return False
        return True

    def generate_hint(self, question: str, topic: Optional[str] = None,
                      difficulty: Optional[str] = None) -> Dict[str, Any]:
        """Generate a short hint for a quiz question."""
        topic_text = topic or 'the topic'
        difficulty_text = difficulty or 'Intermediate'
        user_message = f"""
        Question: {question}
        Topic: {topic_text}
        Difficulty: {difficulty_text}

        Give a concise hint that helps the student without revealing the full answer.
        Return JSON with this structure:
        {{"status": "success", "hint": "short hint here"}}
        """

        messages = [
            {"role": "system", "content": "You are a helpful tutor. Give a brief, non-revealing hint for a quiz question."},
            {"role": "user", "content": user_message}
        ]

        try:
            response = self._call_deepseek_api(messages=messages, temperature=0.5)
            content = response['choices'][0]['message']['content']
            result = self._extract_json_from_response(content)

            if not self._validate_hint_response(result):
                raise ValueError("Invalid hint response format")

            result['status'] = 'success'
            return result
        except Exception as e:
            logger.error(f"Hint generation failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "hint": "Unable to generate a hint right now."
            }

    def grade_answers(self, questions_and_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Grade user answers."""
        if not questions_and_answers:
            return {
                "status": "error",
                "error": "No questions provided for grading",
                "overall_score": "0%",
                "summary_feedback": "No answers to grade.",
                "results": []
            }

        qa_text = "Questions and Answers to Grade:\n\n"
        for item in questions_and_answers:
            qa_text += f"Question {item['id']}: {item['question']}\n"
            qa_text += f"Student Answer: {item['user_answer']}\n\n"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_GRADE},
            {"role": "user", "content": qa_text}
        ]

        try:
            response = self._call_deepseek_api(
                messages=messages,
                temperature=0.3
            )

            content = response['choices'][0]['message']['content']
            result = self._extract_json_from_response(content)

            if not self._validate_grading_response(result):
                raise ValueError("Invalid grading response format")

            result['total_questions'] = len(result.get('results', []))
            result['graded_at'] = datetime.now().isoformat()
            result['model_used'] = self.model

            return result

        except Exception as e:
            logger.error(f"Grading failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "overall_score": "0%",
                "summary_feedback": "An error occurred during grading.",
                "results": []
            }

    def _validate_grading_response(self, response: Dict[str, Any]) -> bool:
        """Validate grading response structure."""
        required_fields = ['overall_score', 'summary_feedback', 'results']

        if not all(field in response for field in required_fields):
            return False

        results = response['results']
        if not isinstance(results, list) or len(results) == 0:
            return False

        required_result_fields = ['id', 'is_correct', 'points_awarded', 'max_points', 'ai_feedback']

        for result in results:
            if not isinstance(result, dict):
                return False
            if not all(field in result for field in required_result_fields):
                return False

            if not isinstance(result['points_awarded'], (int, float)) or not isinstance(result['max_points'],
                                                                                        (int, float)):
                return False
            if result['points_awarded'] > result['max_points'] or result['points_awarded'] < 0:
                return False

        return True


# Convenience functions
def generate_questions_service(topic: str, difficulty: str = "Intermediate",
                               count: int = 5, refinement_prompt: Optional[str] = None,
                               model: Optional[str] = None,
                               question_types: Optional[List[str]] = None) -> Dict[str, Any]:
    """Convenience wrapper for generating questions."""
    service = DeepSeekService(use_free_tier=False, model=model)  # <-- changed to False
    return service.generate_questions(topic, difficulty, count, refinement_prompt, question_types)


def grade_answers_service(questions_and_answers: List[Dict[str, Any]],
                          model: Optional[str] = None) -> Dict[str, Any]:
    """Convenience wrapper for grading answers."""
    service = DeepSeekService(use_free_tier=False, model=model)  # <-- changed to False
    return service.grade_answers(questions_and_answers)