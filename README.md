# AI-Powered Quiz Application 🧠

A fast, interactive quiz application that dynamically generates conceptual questions and provides smart, semantic grading and feedback.

## 🛠️ Tech Stack

* **Backend:** Python (Flask)

* **Frontend:** HTML, CSS, JavaScript

* **AI Core:** OpenRouter API (Accessing free models like DeepSeek, GPT-OSS, and Nemotron)

### Backend Setup

**1. Navigate to the backend directory and install dependencies:**

```bash
cd backend
pip install -r requirements.txt
```

**2. Get Your API Key (OpenRouter)**
We use OpenRouter to access highly capable AI models for free. To get your API key:

1. Go to [OpenRouter.ai](https://openrouter.ai/)

2. Sign up for a free account.

3. Once logged in, navigate to the **API Keys** section and click "Create Key".

4. Copy the generated key (you will only be shown this once).

**3. Configure Environment Variables**
Create a `.env` file in the `backend/` folder and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

*(Note: Never commit your `.env` file to GitHub!)*

**4. Test the AI Integration**
Before starting the server, verify your API key works and the free-tier models are responsive using our built-in test script:

```bash
python test_openrouter.py
```

*What this does:* This script tests the default free model (`openai/gpt-oss-120b:free`) by generating a sample quiz. If the default model fails (e.g., due to temporary rate limits), it will automatically test backup models to find one that is currently working.

**5. Start the Flask server:**

```bash
python app.py
```