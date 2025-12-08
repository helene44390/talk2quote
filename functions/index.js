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
  // CORS is handled automatically by onCall, but we keep this for custom handling if needed
  
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { transcript, type } = request.data;
  const apiKey = geminiApiKey.value();

  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Gemini API key is missing.');
  }

  let prompt = '';
  if (type === 'rewrite') {
    prompt = `Rewrite this quote summary professionally:\n${transcript}`;
  } else {
    prompt = `Extract JSON quote data from:\n${transcript}\nReturn JSON: { scopeSummary, items: [{id, description, qty, price}] }`;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) {
      throw new HttpsError('internal', `Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new HttpsError('internal', 'Invalid AI response');
    }

    if (type === 'rewrite') {
      return { rewrittenText: generatedText.trim() };
    }

    try {
      const cleanJson = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      return { scopeSummary: generatedText, items: [] };
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