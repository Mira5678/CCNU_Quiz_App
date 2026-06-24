"""
DeepSeek API Service Module
Handles all communication with the DeepSeek API for question generation and grading.
"""

# backend/deepseek_service.py
import os
import json
import re
import logging
from typing import Dict, List, Any, Optional
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load .env from parent directory (project root)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Import prompts
from prompts import (
    SYSTEM_PROMPT_GENERATE,
    SYSTEM_PROMPT_GRADE,
    GENERATE_QUESTIONS_TEMPLATE,
    GRADE_ANSWERS_TEMPLATE
)

# Then your service will work
api_key = os.getenv('DEEPSEEK_API_KEY')

class DeepSeekService:
    """Service class for interacting with DeepSeek API."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the DeepSeek service.

        Args:
            api_key: DeepSeek API key. If None, reads from environment variable.
        """
        self.api_key = api_key or os.getenv('DEEPSEEK_API_KEY')
        if not self.api_key:
            raise ValueError("DeepSeek API key is required. Set DEEPSEEK_API_KEY environment variable.")

        self.api_url = "https://api.deepseek.com/v1/chat/completions"
        self.model = "deepseek-chat"  # or "deepseek-reasoner" for more complex reasoning
        self.max_retries = 3
        self.timeout = 30

    def _call_deepseek_api(self, messages: List[Dict[str, str]],
                           temperature: float = 0.7,
                           response_format: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Make a call to the DeepSeek API with retry logic.

        Args:
            messages: List of message objects for the conversation
            temperature: Controls randomness (0.0-1.0)
            response_format: Optional JSON schema for structured output

        Returns:
            API response as dictionary

        Raises:
            Exception: If API call fails after retries
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 4000,
            "stream": False
        }

        # Add response format if specified (for JSON mode)
        if response_format:
            payload["response_format"] = response_format

        for attempt in range(self.max_retries):
            try:
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
                    if attempt < self.max_retries - 1:
                        continue
                    raise Exception(error_msg)

            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries - 1:
                    continue
                raise Exception(f"Request failed after {self.max_retries} attempts: {str(e)}")

        raise Exception("Failed to get response from DeepSeek API")

    def _extract_json_from_response(self, response_content: str) -> Dict[str, Any]:
        """
        Extract JSON from API response, handling markdown code blocks and other formats.

        Args:
            response_content: Raw response text from API

        Returns:
            Parsed JSON as dictionary

        Raises:
            ValueError: If JSON cannot be extracted or parsed
        """
        # Try to find JSON in markdown code blocks
        json_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
        matches = re.findall(json_pattern, response_content)

        if matches:
            # Use the first JSON block found
            json_str = matches[0].strip()
        else:
            # Try to find JSON between curly braces
            brace_pattern = r'\{[\s\S]*\}'
            brace_matches = re.findall(brace_pattern, response_content)
            if brace_matches:
                json_str = brace_matches[0].strip()
            else:
                json_str = response_content.strip()

        # Remove any leading/trailing non-JSON text
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            # Attempt to fix common JSON issues
            cleaned_json = self._clean_json_string(json_str)
            try:
                return json.loads(cleaned_json)
            except json.JSONDecodeError:
                raise ValueError(f"Failed to parse JSON response: {e}\nResponse: {response_content[:200]}...")

    def _clean_json_string(self, json_str: str) -> str:
        """
        Clean common JSON formatting issues.

        Args:
            json_str: Raw JSON string

        Returns:
            Cleaned JSON string
        """
        # Remove trailing commas
        json_str = re.sub(r',\s*}', '}', json_str)
        json_str = re.sub(r',\s*]', ']', json_str)

        # Ensure property names are double-quoted
        json_str = re.sub(r'([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', json_str)

        return json_str

    def generate_questions(self,
                           topic: str,
                           difficulty: str = "Intermediate",
                           count: int = 5,
                           refinement_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate quiz questions using DeepSeek API.

        Args:
            topic: The subject/topic for the questions
            difficulty: Difficulty level (Beginner, Intermediate, Advanced)
            count: Number of questions to generate
            refinement_prompt: Optional refinement instruction for regenerating

        Returns:
            Dictionary containing questions data

        Example:
            >>> service = DeepSeekService()
            >>> result = service.generate_questions("Photosynthesis", "Intermediate", 3)
            >>> print(result['questions'][0]['question_text'])
        """
        # Build the user prompt
        if refinement_prompt:
            user_message = f"""
            Topic: {topic}
            Difficulty: {difficulty}
            Number of questions: {count}

            Previous questions need refinement based on this feedback:
            {refinement_prompt}

            Please generate new questions that address this feedback while maintaining the same topic and difficulty level.
            """
        else:
            user_message = GENERATE_QUESTIONS_TEMPLATE.format(
                topic=topic,
                difficulty=difficulty,
                count=count
            )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_GENERATE},
            {"role": "user", "content": user_message}
        ]

        try:
            # Request JSON format specifically
            response = self._call_deepseek_api(
                messages=messages,
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            # Extract the content from the response
            content = response['choices'][0]['message']['content']

            # Parse the JSON from the response
            result = self._extract_json_from_response(content)

            # Validate the response structure
            if not self._validate_questions_response(result):
                raise ValueError("Invalid questions response format")

            # Add metadata
            result['topic'] = topic
            result['difficulty'] = difficulty
            result['question_count'] = len(result.get('questions', []))
            result['generated_at'] = datetime.now().isoformat()

            return result

        except Exception as e:
            # Return a structured error response
            return {
                "status": "error",
                "error": str(e),
                "topic": topic,
                "difficulty": difficulty,
                "questions": []
            }

    def _validate_questions_response(self, response: Dict[str, Any]) -> bool:
        """
        Validate the structure of the questions response.

        Args:
            response: Response dictionary to validate

        Returns:
            True if valid, False otherwise
        """
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
            if 'id' not in q or 'question_text' not in q:
                return False
            # Ensure question_text is not empty
            if not q['question_text'].strip():
                return False

        return True

    def grade_answers(self, questions_and_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Grade user answers using DeepSeek API with semantic evaluation.

        Args:
            questions_and_answers: List of dictionaries containing questions and answers
                Format: [{"id": 1, "question": "What is X?", "user_answer": "..."}, ...]

        Returns:
            Grading results with scores and feedback

        Example:
            >>> service = DeepSeekService()
            >>> qa = [
            ...     {"id": 1, "question": "What is photosynthesis?", "user_answer": "Process of making food"},
            ... ]
            >>> result = service.grade_answers(qa)
            >>> print(result['overall_score'])
        """
        # Validate input
        if not questions_and_answers:
            return {
                "status": "error",
                "error": "No questions provided for grading",
                "overall_score": "0%",
                "summary_feedback": "No answers to grade.",
                "results": []
            }

        # Build the user message with questions and answers
        qa_text = "Questions and Answers to Grade:\n\n"
        for item in questions_and_answers:
            qa_text += f"Question {item['id']}: {item['question']}\n"
            qa_text += f"Student Answer: {item['user_answer']}\n\n"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_GRADE},
            {"role": "user", "content": qa_text}
        ]

        try:
            # Request JSON format
            response = self._call_deepseek_api(
                messages=messages,
                temperature=0.3,  # Lower temperature for more consistent grading
                response_format={"type": "json_object"}
            )

            # Extract and parse the response
            content = response['choices'][0]['message']['content']
            result = self._extract_json_from_response(content)

            # Validate and enhance the response
            if not self._validate_grading_response(result):
                raise ValueError("Invalid grading response format")

            # Add metadata
            result['total_questions'] = len(result.get('results', []))
            result['graded_at'] = datetime.now().isoformat()

            return result

        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "overall_score": "0%",
                "summary_feedback": "An error occurred during grading.",
                "results": []
            }

    def _validate_grading_response(self, response: Dict[str, Any]) -> bool:
        """
        Validate the structure of the grading response.

        Args:
            response: Response dictionary to validate

        Returns:
            True if valid, False otherwise
        """
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

            # Validate points
            if not isinstance(result['points_awarded'], (int, float)) or not isinstance(result['max_points'],
                                                                                        (int, float)):
                return False
            if result['points_awarded'] > result['max_points'] or result['points_awarded'] < 0:
                return False

        return True


# Convenience functions for easier integration with app.py

def generate_questions_service(topic: str, difficulty: str = "Intermediate",
                               count: int = 5, refinement_prompt: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience wrapper for generating questions.

    Args:
        topic: The subject/topic for the questions
        difficulty: Difficulty level (Beginner, Intermediate, Advanced)
        count: Number of questions to generate
        refinement_prompt: Optional refinement instruction

    Returns:
        Questions data dictionary
    """
    service = DeepSeekService()
    return service.generate_questions(topic, difficulty, count, refinement_prompt)


def grade_answers_service(questions_and_answers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convenience wrapper for grading answers.

    Args:
        questions_and_answers: List of question-answer pairs

    Returns:
        Grading results dictionary
    """
    service = DeepSeekService()
    return service.grade_answers(questions_and_answers)