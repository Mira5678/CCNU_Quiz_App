#!/usr/bin/env python
"""
Edge-case tests for the quiz backend.
Run this while the Flask server is running.
"""

import requests
import json
import sys
from typing import List

BASE_URL = "http://localhost:5000"


def print_section(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_generate(topic: str, difficulty: str, count: int, question_types: List[str], label: str = ""):
    """Generate and validate questions."""
    if label:
        print_section(label)
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
            print(f"❌ Error: {data.get('error')}")
            return None

        questions = data.get("questions", [])
        print(f"✅ Generated {len(questions)} questions:")

        # Check types
        returned_types = [q.get("type") for q in questions]
        print(f"   Returned types: {returned_types}")

        # Verify type filtering (if types specified)
        if question_types:
            # Map short names to full names for comparison
            type_map = {
                "mc": "multiple-choice",
                "tf": "true-false",
                "sa": "short-answer"
            }
            expected_full = [type_map.get(t, t) for t in question_types]
            mismatches = [t for t in returned_types if t not in expected_full]
            if mismatches:
                print(f"   ⚠️  WARNING: Found types not requested: {mismatches}")
            else:
                print(f"   ✅ All types match requested: {question_types}")

        for i, q in enumerate(questions, 1):
            q_text = q.get("question_text", "")[:60] + "..."
            print(f"  Q{i}: {q_text}")

        return data
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def test_custom_topic():
    """Test a topic not in the preset list."""
    print_section("Custom Topic: Astronomy")
    return test_generate("Astronomy", "Medium", 3, ["mc", "sa"])


def test_strict_type_filtering():
    """Test that ONLY requested types are returned."""
    print_section("Strict Type Filter: Only MC")
    return test_generate("Science", "Easy", 5, ["mc"])


def test_refinement():
    """Test regeneration with refinement feedback."""
    print_section("Refinement Prompt")
    # First generate
    data = test_generate("History", "Medium", 2, ["sa"])
    if not data:
        return

    # Now refine
    refinement_payload = {
        "topic": "History",
        "difficulty": "Medium",
        "count": 2,
        "question_types": ["sa"],
        "refinement_prompt": "Make the questions focus more on ancient civilizations rather than modern history."
    }
    print("\n--- Refinement Request ---")
    print(f"Payload: {json.dumps(refinement_payload, indent=2)}")

    try:
        resp = requests.post(f"{BASE_URL}/api/generate", json=refinement_payload)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        if data.get("status") == "error":
            print(f"❌ Error: {data.get('error')}")
            return
        questions = data.get("questions", [])
        print(f"✅ Refined questions generated: {len(questions)}")
        for i, q in enumerate(questions, 1):
            q_text = q.get("question_text", "")[:80] + "..."
            print(f"  Q{i}: {q_text}")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_grading_edges():
    """Test grading with edge-case answers."""
    print_section("Grading Edge Cases")

    # First get a question
    data = test_generate("Literature", "Easy", 1, ["sa"])
    if not data:
        return
    q = data["questions"][0]
    q_text = q["question_text"]
    q_id = q["id"]

    test_cases = [
        ("Correct", q["answer"]),
        ("Partial (first few words)", q["answer"].split(" ")[:3] + ["..."],),  # Actually let's just take first 10 chars
        ("Wrong", "I have no idea what this is about."),
        ("Empty", ""),
        ("Very short", "idk"),
    ]

    # Let's just test 2 cases
    for label, user_ans in [
        ("Correct Answer", q["answer"]),
        ("Wrong Answer", "I don't know this."),
        ("Short Answer", "no"),
    ]:
        print(f"\n--- {label} ---")
        payload = {
            "answers": [
                {
                    "id": q_id,
                    "question": q_text,
                    "user_answer": user_ans,
                }
            ]
        }
        try:
            resp = requests.post(f"{BASE_URL}/api/grade", json=payload)
            data = resp.json()
            if data.get("status") == "error":
                print(f"❌ Error: {data.get('error')}")
                continue
            results = data.get("results", [])
            for r in results:
                print(f"  Points: {r.get('points_awarded')}/{r.get('max_points')} | Correct: {r.get('is_correct')}")
                print(f"  Feedback: {r.get('ai_feedback')[:100]}...")
        except Exception as e:
            print(f"❌ Error: {e}")


def test_invalid_inputs():
    """Test how the backend handles invalid inputs."""
    print_section("Invalid Inputs")

    # Invalid difficulty
    print("\n--- Invalid Difficulty: 'EXTREME' ---")
    test_generate("Science", "EXTREME", 2, ["mc"])

    # Empty topic
    print("\n--- Empty Topic ---")
    try:
        resp = requests.post(f"{BASE_URL}/api/generate", json={"topic": "", "count": 2})
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {data}")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_mixed_topic_variety():
    """Check that Mixed returns questions from different domains."""
    print_section("Mixed Topic Variety")
    data = test_generate("Mixed", "Medium", 5, ["mc"])
    if data:
        questions = data.get("questions", [])
        # Check if questions seem varied (just print them)
        print("\nTopics/Questions (check if varied):")
        for i, q in enumerate(questions, 1):
            q_text = q.get("question_text", "")[:80]
            print(f"  Q{i}: {q_text}")


def run_all():
    print("\n🔬 Running Edge-Case Test Suite")
    print(f"Server: {BASE_URL}")

    # Check server
    try:
        resp = requests.get(f"{BASE_URL}/api/health")
        if resp.status_code != 200:
            print("❌ Server not reachable. Run `python app.py` first.")
            sys.exit(1)
        print("✅ Server reachable")
    except:
        print("❌ Server not reachable. Run `python app.py` first.")
        sys.exit(1)

    # Run tests
    test_strict_type_filtering()
    test_custom_topic()
    test_refinement()
    test_grading_edges()
    test_invalid_inputs()
    test_mixed_topic_variety()

    print("\n✅ All edge-case tests completed!\n")


if __name__ == "__main__":
    run_all()