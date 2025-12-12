const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

admin.initializeApp();

const geminiApiKey = defineString("GEMINI_API_KEY");
const emailUser = defineString("EMAIL_USER");
const emailPassword = defineString("EMAIL_PASSWORD");

// Region: us-central1
exports.generateQuote = onCall({ region: "us-central1", timeoutSeconds: 120, memory: "1GiB" }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { audioBase64, type, mimeType } = request.data;
  const apiKey = geminiApiKey.value();

  if (!apiKey) throw new HttpsError('failed-precondition', 'Gemini API key is missing.');
  if (type !== 'rewrite' && !audioBase64) throw new HttpsError('invalid-argument', 'No audio.');

  // *** UPGRADED TO PRO MODEL FOR SUPERIOR ACCURACY ***
  const MODEL_NAME = "gemini-1.5-pro";

  // *** ENHANCED SYSTEM CONTEXT FOR ACCENT & SPELLING ACCURACY ***
  const systemContext = `
You are an expert Australian trade quote extraction assistant with advanced phonetic interpretation capabilities.

### CRITICAL AUDIO PROCESSING RULES:

1. **ACCENT HANDLING**: The speaker may have ANY accent (French, Australian, British, Indian, Asian, etc.):
   - Use phonetic matching for names and locations
   - "Smiff" → "Smith", "Jonz" → "Jones", "Brigh-un" → "Brian"
   - "Mellburn" → "Melbourne", "Parramatter" → "Parramatta"

2. **SPELLED-OUT WORDS**: When letters are spoken individually (e.g., "S-M-Y-T-H" or "S M Y T H"):
   - ALWAYS combine them into the correct spelling: "SMYTH"
   - Apply to names, streets, and technical terms
   - Example: "P-A-R-K" → "PARK", not "P A R K"

3. **AUSTRALIAN ADDRESS FORMATS**:
   - Format: "Street Number Street Name, Suburb State Postcode"
   - Examples: "12 Collins Street, Melbourne VIC 3000"
   - Common NSW suburbs: Sydney, Parramatta, Penrith, Liverpool, Bankstown
   - Common VIC suburbs: Melbourne, Carlton, Richmond, St Kilda
   - Common QLD suburbs: Brisbane, Gold Coast, Cairns, Townsville
   - States: NSW, VIC, QLD, SA, WA, TAS, NT, ACT

4. **TRADE TERMINOLOGY**: Correctly interpret Australian construction/trade terms:
   - "Reno" → Renovation
   - "Rough in" → Initial installation phase
   - "GPO" → General Power Outlet
   - "Cornice", "Skirting", "Gyprock", "Render", "Screed"
   - "Metre" (not meter), "Labour" (not labor)

5. **NUMBERS & CURRENCY**:
   - "Fifteen hundred" → 1500
   - "Two point five K" → 2500
   - "Fifty bucks" → 50
   - Remove currency symbols from prices (output as numbers only)
`;

  let apiBody;
  if (type === 'rewrite') {
      apiBody = {
        contents: [{
          parts: [{ text: `Rewrite this professionally and clearly:\n\n${request.data.transcript}` }]
        }]
      };
  } else {
      // *** AUDIO PROCESSING WITH ENHANCED PROMPT ***
      apiBody = {
        contents: [{
          parts: [
            {
              text: `${systemContext}

### YOUR TASK:
Listen to this audio recording and extract quote information.

### OUTPUT FORMAT (CRITICAL):
Return ONLY raw JSON with this EXACT structure:

{
  "clientName": "Full name with correct spelling (empty string if not mentioned)",
  "clientAddress": "Complete Australian address (empty string if not mentioned)",
  "scopeOfWork": "Brief professional summary of work to be done",
  "items": [
    {
      "id": 1,
      "description": "Detailed item description",
      "qty": 1,
      "price": 0
    }
  ]
}

### VALIDATION RULES:
- If clientName not mentioned → ""
- If clientAddress not mentioned → ""
- scopeOfWork must always have content (summarize from items if needed)
- items array must contain at least one item
- Each item needs: id (number), description (string), qty (number), price (number)
- Prices must be numbers without $ symbols
- Use proper capitalization for names and addresses
- Ensure correct Australian spelling (labour, metre, etc.)

Now process the audio:`
            },
            {
              inlineData: {
                mimeType: mimeType || "audio/webm;codecs=opus",
                data: audioBase64
              }
            }
          ]
        }]
      };
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(apiBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Gemini API Failure:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new HttpsError('internal', `Gemini API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      logger.error("Empty AI response:", JSON.stringify(result));
      throw new HttpsError('internal', 'AI returned empty response.');
    }

    if (type === 'rewrite') {
      return { rewrittenText: generatedText.trim() };
    }

    // *** ENHANCED JSON PARSING WITH VALIDATION ***
    try {
      const cleanJson = generatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^[^{]*({.*})[^}]*$/s, '$1')
        .trim();

      const parsedData = JSON.parse(cleanJson);

      // Validate and sanitize items array
      if (!parsedData.items || !Array.isArray(parsedData.items)) {
        parsedData.items = [];
      }

      parsedData.items = parsedData.items.map((item, index) => ({
        id: item.id || index + 1,
        description: item.description || '',
        qty: typeof item.qty === 'number' ? item.qty : 1,
        price: typeof item.price === 'number' ? item.price : 0
      }));

      // Return validated structure
      return {
        clientName: parsedData.clientName || '',
        clientAddress: parsedData.clientAddress || '',
        scopeOfWork: parsedData.scopeOfWork || '',
        items: parsedData.items
      };

    } catch (parseError) {
      logger.error("JSON Parse Error:", {
        error: parseError.message,
        rawResponse: generatedText.substring(0, 500)
      });

      // Fallback response
      return {
        clientName: "",
        clientAddress: "",
        scopeOfWork: generatedText,
        items: []
      };
    }

  } catch (error) {
    logger.error("Generate Quote Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});

exports.sendQuoteEmail = onCall({ region: "us-central1" }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipientEmail, quoteData, pdfBase64, companyDetails, bccEmail } = request.data;

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
      attachments: pdfBase64 ? [{
        filename: `Quote_${quoteData.id}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      }] : []
    };

    await transporter.sendMail(mailOptions);
    logger.info("Email sent successfully to:", recipientEmail);

    return { success: true };

  } catch (error) {
    logger.error("Email Error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});
