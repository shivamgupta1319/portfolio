// This is your serverless function code (netlify/functions/gemini.js)

exports.handler = async function (event, context) {
    // Get the prompt from the request sent by your portfolio
    const { prompt } = JSON.parse(event.body);

    // Get the secret API key from environment variables
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `API call failed with status: ${response.status}` })
            };
        }

        const result = await response.json();

        // Send the result back to your portfolio page
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};