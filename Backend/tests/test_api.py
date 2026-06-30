#!/usr/bin/env python
"""
Quick API test script for the quiz backend.
Run this while the Flask server is running.
"""

import requests
import json
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:5000"


def print_section(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_health():
    """Test the health endpoint."""
    print_section("Health Check")
    try:
        resp = requests.get(f"{BASE_URL}/api/health")
        print(f"Status: {resp.status_code}")
        print(json.dumps(resp.json(), indent=2))
        return resp.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False


def test_generate(topic: str, difficulty: str, count: int, question_types: list):
    """Test question generation."""
    print_section(f"Generate: {topic} ({difficulty})")
    payload = {
        "topic": topic,
        "difficulty": difficulty,
        "count": count,
        "question_types": question_types,
    }
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        resp = requests.post(f"{BASE_URL}/api/generate", json=payload)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if data.get("status") == "error":
            print(f"Error: {data.get('error')}")
            return None

        questions = data.get("questions", [])
        print(f"Generated {len(questions)} questions:")
        for i, q in enumerate(questions, 1):
            q_type = q.get("type", "unknown")
            q_text = q.get("question_text", "")[:80] + "..."
            print(f"  Q{i}: [{q_type}] {q_text}")
        return data
    except Exception as e:
        print(f"Error: {e}")
        return None


def test_grade(question: str, user_answer: str, q_id: int):
    """Test grading."""
    print_section("Grade Answer")
    payload = {
        "answers": [
            {
                "id": q_id,
                "question": question,
                "user_answer": user_answer,
            }
        ]
    }
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        resp = requests.post(f"{BASE_URL}/api/grade", json=payload)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if data.get("status") == "error":
            print(f"Error: {data.get('error')}")
            return None

        results = data.get("results", [])
        print(f"Overall Score: {data.get('overall_score')}")
        print(f"Summary: {data.get('summary_feedback')}")
        for r in results:
            print(
                f"  Q{r.get('id')}: correct={r.get('is_correct')}, points={r.get('points_awarded')}/{r.get('max_points')}")
            print(f"    Feedback: {r.get('ai_feedback')}")
        return data
    except Exception as e:
        print(f"Error: {e}")
        return None


def test_hint(question: str, topic: str = "Geography", difficulty: str = "Hard"):
    """Test hint generation."""
    print_section("Get Hint")
    payload = {
        "question": question,
        "topic": topic,
        "difficulty": difficulty,
    }
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        resp = requests.post(f"{BASE_URL}/api/hint", json=payload)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if data.get("status") == "error":
            print(f"Error: {data.get('error')}")
        else:
            print(f"Hint: {data.get('hint')}")
        return data
    except Exception as e:
        print(f"Error: {e}")
        return None


def run_all_tests():
    """Run a full test suite."""
    print("\n🚀 Starting API Test Suite")
    print(f"Server: {BASE_URL}")

    # 1. Health
    if not test_health():
        print("\n❌ Server not reachable. Make sure `python app.py` is running.")
        sys.exit(1)

    # 2. Generate mixed
    gen_data = test_generate("Geography", "Hard", 3, ["mc", "tf", "sa"])
    if not gen_data:
        print("\n❌ Generation failed. Check the backend logs.")
        sys.exit(1)

    questions = gen_data.get("questions", [])
    if len(questions) < 1:
        print("\n❌ No questions generated.")
        sys.exit(1)

    # 3. Grade the first question (with a correct-ish answer)
    q1 = questions[0]
    q_text = q1.get("question_text", "")
    q_answer = q1.get("answer", "")

    # For MC/TF, use the answer as the user's guess (to test correct)
    if q1.get("type") in ["multiple-choice", "true-false"]:
        user_ans = q_answer
    else:
        # For short-answer, give a partial correct answer
        user_ans = q_answer[:50] + "..." if len(q_answer) > 50 else q_answer

    test_grade(q_text, user_ans, q1.get("id", 1))

    # 4. Hint for the second question (if exists)
    if len(questions) >= 2:
        q2 = questions[1]
        test_hint(q2.get("question_text", ""), "Geography", "Hard")

    # 5. Test a different topic (e.g., Science)
    print_section("Additional: Science (Easy, MC only)")
    test_generate("Science", "Easy", 2, ["mc"])

    # 6. Test Mixed topic
    print_section("Additional: Mixed (Medium, all types)")
    test_generate("Mixed", "Medium", 3, ["mc", "tf", "sa"])

    print("\n✅ All tests completed!\n")


if __name__ == "__main__":
    run_all_tests()