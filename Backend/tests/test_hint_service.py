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


if __name__ == "__main__":
    unittest.main()
