const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");

admin.initializeApp();

// Define configuration parameters (these pull from your .env file)
const geminiApiKey = defineString("GEMINI_API_KEY");
const emailUser = defineString("EMAIL_USER");
const emailPassword = defineString("EMAIL_PASSWORD");

exports.generateQuote = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { transcript, type } = request.data;
  const apiKey = geminiApiKey.value();

  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Gemini API key is missing.');
  }

  let prompt = '';
  const MODEL_NAME = 'gemini-1.5-pro';

  if (type === 'rewrite') {
    prompt = `Rewrite this quote summary professionally and clearly:\n\n${transcript}`;
  } else {
    prompt = `You are an expert quote extraction assistant specializing in voice transcription accuracy.

CRITICAL INSTRUCTIONS:
1. ACCENTS & PRONUNCIATION: This transcript may contain French, Australian, British, Indian, or other accents. Interpret phonetically similar words correctly (e.g., "Smiff" → "Smith", "Jonz" → "Jones").

2. SPELLED NAMES: When letters are spoken individually (e.g., "S-M-Y-T-H" or "S M Y T H"), combine them into the correct spelling: SMYTH.

3. AUSTRALIAN ADDRESSES: Use Australian address formats:
   - Street number + street name + street type (e.g., "12 Collins Street")
   - Suburb, State, Postcode (e.g., "Melbourne VIC 3000")
   - Common Australian states: NSW, VIC, QLD, SA, WA, TAS, NT, ACT

4. BUSINESS TERMINOLOGY: Correctly interpret trade-specific terms (e.g., "metre" for measurements, "labour" for work, "GST" for tax).

5. NUMBERS & CURRENCY: Parse spoken numbers accurately ("fifteen hundred" → 1500, "two point five K" → 2500).

TRANSCRIPT:
${transcript}

OUTPUT REQUIREMENTS:
Extract the quote information and return ONLY valid JSON in this EXACT structure (no markdown, no explanation):
{
  "clientName": "Full client name with correct spelling",
  "clientAddress": "Complete address in Australian format",
  "scopeOfWork": "Brief summary of work to be done",
  "items": [
    {
      "id": 1,
      "description": "Item description",
      "qty": 1,
      "price": 0
    }
  ]
}

RULES:
- If clientName is not mentioned, use empty string ""
- If clientAddress is not mentioned, use empty string ""
- If scopeOfWork cannot be determined, provide a brief summary of the items
- Items array must contain at least one item
- Each item must have id (number), description (string), qty (number), price (number)
- All prices should be numbers without currency symbols
- Ensure proper capitalization for names and addresses`;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          topP: 0.8,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API Error Response:", errorBody);
      throw new HttpsError('internal', `Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error("Invalid AI response structure:", JSON.stringify(result));
      throw new HttpsError('internal', 'Invalid AI response');
    }

    if (type === 'rewrite') {
      return { rewrittenText: generatedText.trim() };
    }

    try {
      const cleanJson = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*({.*})[^}]*$/s, '$1')
        .trim();

      const parsedData = JSON.parse(cleanJson);

      if (!parsedData.items || !Array.isArray(parsedData.items)) {
        parsedData.items = [];
      }

      parsedData.items = parsedData.items.map((item, index) => ({
        id: item.id || index + 1,
        description: item.description || '',
        qty: typeof item.qty === 'number' ? item.qty : 1,
        price: typeof item.price === 'number' ? item.price : 0
      }));

      return {
        clientName: parsedData.clientName || '',
        clientAddress: parsedData.clientAddress || '',
        scopeOfWork: parsedData.scopeOfWork || '',
        items: parsedData.items
      };
    } catch (e) {
      console.error("JSON Parse Error:", e.message, "\nRaw response:", generatedText);
      return {
        clientName: '',
        clientAddress: '',
        scopeOfWork: generatedText,
        items: []
      };
    }

  } catch (error) {
    console.error("Generate Quote Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});

exports.sendQuoteEmail = onCall({ region: "asia-southeast1" }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipientEmail, quoteData, pdfBase64, companyDetails, bccEmail } = request.data;

    // Retrieve credentials from parameters
    const user = emailUser.value();
    const pass = emailPassword.value();

    if (!user || !pass) {
      throw new HttpsError('failed-precondition', 'Email credentials missing in config');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    const mailOptions = {
      from: `${companyDetails?.name || 'Talk2Quote'} <${user}>`,
      to: recipientEmail,
      bcc: bccEmail,
      subject: `Quote #${quoteData.id}`,
      html: `<p>Please find your quote attached.</p>`,
      attachments: pdfBase64 ? [{ filename: `Quote_${quoteData.id}.pdf`, content: pdfBase64, encoding: 'base64' }] : []
    };

    await transporter.sendMail(mailOptions);
    return { success: true };

  } catch (error) {
    console.error("Email Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});