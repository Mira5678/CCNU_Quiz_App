# backend/test_deepseek_file.py
import os
import sys
import json
from dotenv import load_dotenv

# Load .env from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Check if API key exists
api_key = os.getenv('DEEPSEEK_API_KEY')
if not api_key:
    print("❌ ERROR: DEEPSEEK_API_KEY not found in .env file!")
    print(f"   Looking for .env at: {os.path.join(os.path.dirname(__file__), '..', '.env')}")
    sys.exit(1)
else:
    print(f"✅ API Key found: {api_key[:10]}... (length: {len(api_key)})")

# Import from deepseek.py
try:
    from deepseek import DeepSeekService, generate_questions_service, grade_answers_service

    print("✅ Successfully imported from deepseek.py")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("   Make sure deepseek.py exists in the backend folder")
    sys.exit(1)


def test_connection():
    """Test if the service can connect to DeepSeek API."""
    print("\nTesting DeepSeek API connection...")

    try:
        service = DeepSeekService()
        print("✅ Service initialized successfully!")
        return service
    except Exception as e:
        print(f"❌ Error initializing service: {e}")
        return None


def test_generate_questions():
    """Test question generation."""
    print("\nTesting question generation...")

    try:
        result = generate_questions_service(
            topic="Photosynthesis",
            difficulty="Intermediate",
            count=2
        )

        # Print the raw result for debugging
        print(f"Raw result status: {result.get('status')}")

        if result.get('status') == 'error':
            print(f"❌ Error: {result.get('error')}")
            # Print the full result for debugging
            print(f"Full error response: {json.dumps(result, indent=2)}")
            return False

        print(f"✅ Generated {len(result.get('questions', []))} questions")

        # Show first question
        questions = result.get('questions', [])
        if questions:
            print(f"First question: {questions[0].get('question_text', 'N/A')}")

        return True

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_grade_answers():
    """Test answer grading."""
    print("\nTesting answer grading...")

    try:
        qa = [
            {
                "id": 1,
                "question": "What is photosynthesis?",
                "user_answer": "The process where plants convert sunlight into energy"
            },
            {
                "id": 2,
                "question": "What is chlorophyll?",
                "user_answer": "A green pigment in plants"
            }
        ]

        result = grade_answers_service(qa)

        if result.get('status') == 'error':
            print(f"❌ Error: {result.get('error')}")
            return False

        print(f"✅ Grading complete!")
        print(f"Overall score: {result.get('overall_score', 'N/A')}")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("Testing DeepSeek Service (deepseek.py)")
    print("=" * 50)

    # Test 1: Connection
    service = test_connection()

    if service:
        # Test 2: Generate Questions
        generate_ok = test_generate_questions()

        # Test 3: Grade Answers
        grade_ok = test_grade_answers()

        print("\n" + "=" * 50)
        print("TEST RESULTS:")
        print(f"✅ Connection: PASS")
        print(f"✅ Generation: {'PASS' if generate_ok else 'FAIL'}")
        print(f"✅ Grading: {'PASS' if grade_ok else 'FAIL'}")
    else:
        print("\n❌ Cannot proceed with tests - connection failed.")