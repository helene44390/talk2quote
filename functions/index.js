const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.generateQuote = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate quotes.'
    );
  }

  const { transcript, type } = data;

  if (!transcript || transcript.trim().length < 5) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Transcript must be at least 5 characters long.'
    );
  }

  const GEMINI_API_KEY = functions.config().gemini?.api_key;

  if (!GEMINI_API_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key is not configured.'
    );
  }

  let prompt;

  if (type === 'rewrite') {
    prompt = `Rewrite the following job scope summary to be more professional, clear, and comprehensive. Keep all important details but improve the structure and language:\n\n${transcript}`;
  } else {
    prompt = `
      You are a precise transcription assistant for trade quotes.
      CRITICAL RULES:
      1. Convert the speech EXACTLY as spoken into a professional "Scope of Work" format
      2. DO NOT invent prices/quantities unless mentioned. Use 0 if unknown.
      3. ONLY extract line items clearly mentioned.
      TRANSCRIPT: "${transcript}"
      JSON FORMAT REQUIRED:
      { "scopeSummary": "Summary text", "items": [ { "id": 1, "description": "Item", "qty": 0, "price": 0 } ] }
    `;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    const textResult = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResult) {
      throw new Error('Empty response from Gemini API');
    }

    if (type === 'rewrite') {
      return { rewrittenText: textResult };
    }

    const jsonString = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedResult = JSON.parse(jsonString);

    const safeItems = (parsedResult.items || []).map((item, index) => ({
      ...item,
      id: index + 1,
      qty: Number(item.qty) || 0,
      price: Number(item.price) || 0,
      description: String(item.description || '')
    }));

    return {
      scopeSummary: parsedResult.scopeSummary,
      items: safeItems
    };

  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process request with AI: ' + error.message
    );
  }
});
