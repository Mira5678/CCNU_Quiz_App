# backend/test_openrouter.py
import os
import sys
import json
from dotenv import load_dotenv

# Load .env
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Check API key
api_key = os.getenv('OPENROUTER_API_KEY')
if not api_key:
    print("❌ ERROR: OPENROUTER_API_KEY not found in .env file!")
    sys.exit(1)

print(f"✅ OpenRouter API Key found: {api_key[:20]}...")

# Import service
from deepseek import DeepSeekService, generate_questions_service, grade_answers_service

# CURRENT WORKING FREE MODELS (Jan 2026)
FREE_MODELS = {
    "gpt_oss": "openai/gpt-oss-120b:free",  # Best overall
    "nemotron_ultra": "nvidia/nemotron-3-ultra:free",  # Great reasoning
    "nemotron_super": "nvidia/nemotron-3-super:free",  # Very capable
    "owl_alpha": "owlalpha/owl-alpha:free",  # Good all-around
    "poolside": "poolside/laguna-m1:free",  # Good for logic
}


def test_model(model_name, model_id):
    """Test a specific model."""
    print(f"\n{'=' * 50}")
    print(f"Testing: {model_name}")
    print(f"Model ID: {model_id}")
    print('=' * 50)

    try:
        service = DeepSeekService(use_free_tier=True, model=model_id)
        print(f"✅ Service initialized")

        # Test generation
        result = service.generate_questions(
            topic="Photosynthesis",
            difficulty="Beginner",
            count=2
        )

        if result.get('status') == 'error':
            print(f"❌ Error: {result.get('error')}")
            return False

        print(f"✅ Generated {len(result.get('questions', []))} questions:")
        for q in result.get('questions', []):
            print(f"   Q{q.get('id')}: {q.get('question_text')}")

        print(f"✅ Model {model_name} works!")
        return True

    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def test_default_model():
    """Test with the default model."""
    print("\n" + "=" * 50)
    print("Testing Default Model (OpenAI GPT OSS 120B)")
    print("=" * 50)

    try:
        result = generate_questions_service(
            topic="Photosynthesis",
            difficulty="Beginner",
            count=2
        )

        if result.get('status') == 'error':
            print(f"❌ Error: {result.get('error')}")
            return False

        print(f"✅ Generated {len(result.get('questions', []))} questions:")
        for q in result.get('questions', []):
            print(f"   Q{q.get('id')}: {q.get('question_text')}")

        print(f"✅ Default model works!")
        return True

    except Exception as e:
        print(f"❌ Failed: {e}")
        return False


def find_working_model():
    """Find the first working model."""
    print("\n" + "=" * 50)
    print("Searching for Working Free Model...")
    print("=" * 50)

    working_models = []

    for name, model_id in FREE_MODELS.items():
        try:
            service = DeepSeekService(use_free_tier=True, model=model_id)
            result = service.generate_questions("Photosynthesis", "Beginner", 1)

            if result.get('status') != 'error':
                print(f"✅ {name} works!")
                working_models.append((name, model_id))
            else:
                print(f"❌ {name} failed: {result.get('error')[:100]}...")
        except Exception as e:
            print(f"❌ {name} error: {str(e)[:100]}...")

    return working_models


if __name__ == "__main__":
    print("=" * 60)
    print("Testing OpenRouter Free Models (Jan 2026)")
    print("Models: GPT-OSS, Nemotron, Owl, Poolside")
    print("=" * 60)

    # Try default first
    success = test_default_model()

    if success:
        print("\n" + "=" * 50)
        print("✅ SUCCESS! Default model works!")
        print("   You can use the quiz generator for free.")
        print("=" * 50)
    else:
        print("\n⚠️ Default model failed. Trying alternatives...")
        working = find_working_model()

        if working:
            print("\n" + "=" * 50)
            print(f"✅ Found working models: {[name for name, _ in working]}")
            print("   Update default in deepseek.py")
            print("=" * 50)
        else:
            print("\n" + "=" * 50)
            print("❌ No working free models found.")
            print("   You may need to:")
            print("   1. Check your OpenRouter API key")
            print("   2. Add credits to your OpenRouter account")
            print("   3. Try Groq (completely free) instead")
            print("=" * 50)