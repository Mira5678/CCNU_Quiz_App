import os
import json
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from llm_service import generate_questions_service, grade_answers_service, DeepSeekService
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__,
            static_folder='frontend_build',
            static_url_path='')

CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload


# -------------------- Frontend serving --------------------

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.static_folder, path)
    except Exception:
        return send_from_directory(app.static_folder, 'index.html')


# -------------------- API routes --------------------

@app.route('/api/generate', methods=['POST'])
def generate_questions():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "Missing JSON payload"}), 400

        topic = data.get('topic', '').strip()
        difficulty_input = data.get('difficulty', 'Intermediate')
        count = data.get('count', 5)
        refinement_prompt = data.get('refinement_prompt')
        question_types = data.get('question_types', [])
        if not isinstance(question_types, list):
            question_types = []
        question_types = [str(item).strip().lower() for item in question_types if str(item).strip()]

        if not topic:
            return jsonify({"status": "error", "error": "Topic is required"}), 400

        # ---- FIX: Map frontend difficulty to backend values ----
        difficulty_map = {
            "easy": "Beginner",
            "medium": "Intermediate",
            "hard": "Advanced",
            "all": "Intermediate",   # fallback for "all"
        }
        # Normalize to lowercase for mapping
        normalized_difficulty = difficulty_input.lower()
        mapped = difficulty_map.get(normalized_difficulty, difficulty_input)

        # Validate against allowed values
        valid_difficulties = ['Beginner', 'Intermediate', 'Advanced']
        difficulty = mapped if mapped in valid_difficulties else 'Intermediate'

        # Validate count
        try:
            count = int(count)
            if count < 1 or count > 20:
                count = 5
        except (ValueError, TypeError):
            count = 5

        logger.info(f"Generating {count} {difficulty} questions about '{topic}'")
        if refinement_prompt:
            logger.info(f"With refinement: {refinement_prompt}")

        result = generate_questions_service(
            topic=topic,
            difficulty=difficulty,
            count=count,
            refinement_prompt=refinement_prompt,
            question_types=question_types
        )

        if result.get('status') == 'error':
            return jsonify(result), 500

        if not result.get('questions'):
            return jsonify({
                "status": "error",
                "error": "No questions were generated. Please try again with a different topic.",
                "questions": []
            }), 500

        result['status'] = 'success'
        logger.info(f"Successfully generated {len(result['questions'])} questions")
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in /api/generate: {str(e)}")
        return jsonify({
            "status": "error",
            "error": f"Server error: {str(e)}",
            "questions": []
        }), 500


@app.route('/api/grade', methods=['POST'])
def grade_answers():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "Missing JSON payload"}), 400

        answers = data.get('answers', [])
        if not answers:
            return jsonify({"status": "error", "error": "No answers provided for grading"}), 400

        for answer in answers:
            if not isinstance(answer, dict):
                return jsonify({"status": "error", "error": "Invalid answer format"}), 400
            required_fields = ['id', 'question', 'user_answer']
            if not all(field in answer for field in required_fields):
                return jsonify({
                    "status": "error",
                    "error": f"Missing required fields. Required: {required_fields}"
                }), 400

            user_answer = answer.get('user_answer', '').strip()
            if not user_answer:
                answer['user_answer'] = '[No answer provided]'
            elif len(user_answer) < 3:
                answer['user_answer'] = f'[Answer too short: "{user_answer}"]'

        logger.info(f"Grading {len(answers)} answers")
        result = grade_answers_service(answers)

        if result.get('status') == 'error':
            return jsonify(result), 500

        result['status'] = 'success'
        logger.info(f"Successfully graded {len(answers)} answers")
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in /api/grade: {str(e)}")
        return jsonify({
            "status": "error",
            "error": f"Server error: {str(e)}",
            "overall_score": "0%",
            "summary_feedback": "An error occurred during grading.",
            "results": []
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "AI Quiz Generator",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    })


@app.route('/api/hint', methods=['POST'])
def generate_hint():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "error": "Missing JSON payload"}), 400

        question = (data.get('question') or '').strip()
        topic = (data.get('topic') or '').strip()
        difficulty = (data.get('difficulty') or 'Intermediate').strip()

        if not question:
            return jsonify({"status": "error", "error": "Question is required"}), 400

        service = DeepSeekService(use_free_tier=False)
        result = service.generate_hint(question=question, topic=topic or None, difficulty=difficulty or None)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in /api/hint: {str(e)}")
        return jsonify({
            "status": "error",
            "error": f"Server error: {str(e)}",
            "hint": "Unable to generate a hint right now."
        }), 500


@app.route('/api/models', methods=['GET'])
def get_models():
    return jsonify({
        "free_tier": {
            "active": True,
            "default_model": "openai/gpt-oss-120b:free",
            "available_models": [
                "openai/gpt-oss-120b:free",
                "nvidia/nemotron-3-ultra:free",
                "nvidia/nemotron-3-super:free",
                "owlalpha/owl-alpha:free",
                "poolside/laguna-m1:free"
            ]
        },
        "paid_tier": {
            "active": False,
            "model": "deepseek-chat"
        }
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({"status": "error", "error": "Internal server error"}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'

    logger.info(f"Starting AI Quiz Generator server on http://localhost:{port}")
    logger.info(f"Debug mode: {debug}")

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )