import os
import json
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from llm_service import generate_questions_service, grade_answers_service
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
            static_folder='../frontend',
            static_url_path='')

CORS(app)  # Enable CORS for development

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload


@app.route('/')
def serve_index():
    """Serve the main HTML page."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, HTML)."""
    return send_from_directory(app.static_folder, path)


@app.route('/api/generate', methods=['POST'])
def generate_questions():
    """
    Generate quiz questions based on topic and difficulty.
    
    Expected JSON payload:
    {
        "topic": "Photosynthesis",
        "difficulty": "Intermediate",  # Beginner, Intermediate, Advanced
        "count": 5,                    # Number of questions
        "refinement_prompt": "Make them more conceptual"  # Optional
    }
    
    Returns:
    {
        "status": "success",
        "topic": "Photosynthesis",
        "difficulty": "Intermediate",
        "question_count": 5,
        "questions": [
            {
                "id": 1,
                "question_text": "What is the primary role of chlorophyll..."
            }
        ]
    }
    """
    try:
        # Get and validate request data
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "error": "Missing JSON payload"
            }), 400

        topic = data.get('topic', '').strip()
        difficulty = data.get('difficulty', 'Intermediate')
        count = data.get('count', 5)
        refinement_prompt = data.get('refinement_prompt')

        # Validate required fields
        if not topic:
            return jsonify({
                "status": "error",
                "error": "Topic is required"
            }), 400

        # Validate difficulty
        valid_difficulties = ['Beginner', 'Intermediate', 'Advanced']
        if difficulty not in valid_difficulties:
            difficulty = 'Intermediate'

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

        # Call the service
        result = generate_questions_service(
            topic=topic,
            difficulty=difficulty,
            count=count,
            refinement_prompt=refinement_prompt
        )

        # Check if generation was successful
        if result.get('status') == 'error':
            return jsonify(result), 500

        # Ensure we have questions
        if not result.get('questions'):
            return jsonify({
                "status": "error",
                "error": "No questions were generated. Please try again with a different topic.",
                "questions": []
            }), 500

        # Add status field for frontend
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
    """
    Grade user answers.
    
    Expected JSON payload:
    {
        "answers": [
            {
                "id": 1,
                "question": "What is the primary role of chlorophyll...",
                "user_answer": "Chlorophyll absorbs light energy..."
            }
        ]
    }
    
    Returns:
    {
        "status": "success",
        "overall_score": "80%",
        "summary_feedback": "Great understanding...",
        "results": [
            {
                "id": 1,
                "is_correct": true,
                "points_awarded": 10,
                "max_points": 10,
                "ai_feedback": "Spot on..."
            }
        ]
    }
    """
    try:
        # Get and validate request data
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "error": "Missing JSON payload"
            }), 400

        answers = data.get('answers', [])
        
        if not answers:
            return jsonify({
                "status": "error",
                "error": "No answers provided for grading"
            }), 400

        # Validate each answer
        for answer in answers:
            if not isinstance(answer, dict):
                return jsonify({
                    "status": "error",
                    "error": "Invalid answer format"
                }), 400
            
            required_fields = ['id', 'question', 'user_answer']
            if not all(field in answer for field in required_fields):
                return jsonify({
                    "status": "error",
                    "error": f"Missing required fields. Required: {required_fields}"
                }), 400

            # Check if answer is empty or too short
            user_answer = answer.get('user_answer', '').strip()
            if not user_answer:
                answer['user_answer'] = '[No answer provided]'
            elif len(user_answer) < 3:
                answer['user_answer'] = f'[Answer too short: "{user_answer}"]'

        logger.info(f"Grading {len(answers)} answers")

        # Call the service
        result = grade_answers_service(answers)

        # Check if grading was successful
        if result.get('status') == 'error':
            return jsonify(result), 500

        # Add status field for frontend
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
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "AI Quiz Generator",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    })


@app.route('/api/models', methods=['GET'])
def get_models():
    """
    Get available models and their status.
    This helps the frontend know which models are available.
    """
    # Return both free and paid options
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
            "active": False,  # Change to True if you have DeepSeek API key
            "model": "deepseek-chat"
        }
    })


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({
        "status": "error",
        "error": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        "status": "error",
        "error": "Internal server error"
    }), 500


if __name__ == '__main__':
    # Get port from environment or use default
    port = int(os.getenv('PORT', 5000))
    
    # Get debug mode from environment
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Starting AI Quiz Generator server on http://localhost:{port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )