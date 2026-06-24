/*Generate Questions*/
async function generateQuiz() {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            topic: 'Photosynthesis',
            difficulty: 'Intermediate',
            count: 5
        })
    });
    const data = await response.json();
    // Render questions from data.questions
}

/*Submit the quiz to be graded and display the results */
async function submitQuiz() {
    const answers = collectAnswers(); // Array of {id, question, user_answer}
    const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
    });
    const results = await response.json();
    // Display results.overall_score, results.summary_feedback, etc.
}