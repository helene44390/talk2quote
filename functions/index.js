const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const cors = require("cors")({origin: true});
admin.initializeApp();

// Explicitly set region to asia-southeast1 (Singapore)
exports.generateQuote = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  try {
    const { transcript, type } = data;

    if (!transcript) {
      throw new functions.https.HttpsError('invalid-argument', 'transcript is required');
    }

    const apiKey = functions.config().gemini.api_key;
    if (!apiKey) {
      console.error("CRITICAL ERROR: functions.config().gemini.api_key is missing.");
      throw new functions.https.HttpsError('failed-precondition', 'API Key not configured.');
    }

    let prompt = '';
    if (type === 'rewrite') {
      prompt = `Rewrite this quote summary professionally:\n${transcript}`;
    } else {
      prompt = `Extract JSON quote data from:\n${transcript}\nReturn JSON: { scopeSummary, items: [{id, description, qty, price}] }`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) throw new functions.https.HttpsError('internal', `Gemini API error: ${response.statusText}`);

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new functions.https.HttpsError('internal', 'Invalid AI response');

    if (type === 'rewrite') return { rewrittenText: generatedText.trim() };

    try {
      const cleanJson = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      return { scopeSummary: generatedText, items: [] };
    }
  } catch (error) {
    console.error("Generate Quote Error:", error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.sendQuoteEmail = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  try {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');

    const { recipientEmail, quoteData, pdfBase64, companyDetails, bccEmail } = data;

    const emailConfig = functions.config().email;
    if (!emailConfig?.user || !emailConfig?.password) {
      throw new functions.https.HttpsError('failed-precondition', 'Email credentials missing in config');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: emailConfig.user, pass: emailConfig.password }
    });

    const mailOptions = {
      from: `${companyDetails?.name || 'Talk2Quote'} <${emailConfig.user}>`,
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
    throw new functions.https.HttpsError('internal', error.message);
  }
});
