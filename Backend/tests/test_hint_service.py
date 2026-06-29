import sys
import unittest
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from llm_service import DeepSeekService


class HintServiceTests(unittest.TestCase):
    def test_generate_hint_returns_hint_payload(self):
        service = DeepSeekService.__new__(DeepSeekService)
        service._call_deepseek_api = lambda *args, **kwargs: {
            "choices": [{"message": {"content": '{"status": "success", "hint": "Think about the role of light and chlorophyll."}'}}]
        }
        service._extract_json_from_response = DeepSeekService._extract_json_from_response.__get__(service, DeepSeekService)
        service._validate_hint_response = DeepSeekService._validate_hint_response.__get__(service, DeepSeekService)

        result = service.generate_hint(
            question="What is the main role of chlorophyll in photosynthesis?",
            topic="Photosynthesis",
            difficulty="Intermediate",
        )

        self.assertEqual(result["status"], "success")
        self.assertIn("chlorophyll", result["hint"].lower())

    def test_generate_questions_uses_diverse_topics_for_mixed(self):
        service = DeepSeekService.__new__(DeepSeekService)
        service.model = "test-model"
        captured_messages = {}

        def fake_call(messages, temperature=0.7, response_format=None):
            captured_messages["messages"] = messages
            return {
                "choices": [{"message": {"content": '{"status": "success", "questions": [{"id": 1, "question_text": "What is the capital of France?", "answer": "Paris", "explanation": "Paris is the capital of France."}]}'}}]
            }

        service._call_deepseek_api = fake_call
        service._extract_json_from_response = DeepSeekService._extract_json_from_response.__get__(service, DeepSeekService)
        service._validate_questions_response = DeepSeekService._validate_questions_response.__get__(service, DeepSeekService)

        result = service.generate_questions(topic="Mixed", difficulty="Intermediate", count=3)

        self.assertEqual(result["status"], "success")
        prompt_text = captured_messages["messages"][1]["content"].lower()
        self.assertIn("science", prompt_text)
        self.assertIn("technology", prompt_text)
        self.assertIn("geography", prompt_text)

    def test_generate_questions_mentions_selected_question_types(self):
        service = DeepSeekService.__new__(DeepSeekService)
        service.model = "test-model"
        captured_messages = {}

        def fake_call(messages, temperature=0.7, response_format=None):
            captured_messages["messages"] = messages
            return {
                "choices": [{"message": {"content": '{"status": "success", "questions": [{"id": 1, "question_text": "Why do plants need sunlight?", "answer": "To make food", "explanation": "Plants use sunlight for photosynthesis."}]}'}}]
            }

        service._call_deepseek_api = fake_call
        service._extract_json_from_response = DeepSeekService._extract_json_from_response.__get__(service, DeepSeekService)
        service._validate_questions_response = DeepSeekService._validate_questions_response.__get__(service, DeepSeekService)

        result = service.generate_questions(
            topic="Science",
            difficulty="Intermediate",
            count=3,
            question_types=["mc", "tf", "sa"],
        )

        self.assertEqual(result["status"], "success")
        prompt_text = captured_messages["messages"][1]["content"].lower()
        self.assertIn("multiple choice", prompt_text)
        self.assertIn("true/false", prompt_text)
        self.assertIn("short answer", prompt_text)


if __name__ == "__main__":
    unittest.main()
