const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { GoogleAuth } = require('google-auth-library');
const nodemailer = require("nodemailer");
// NEW IMPORTS FOR STRIPE
const stripe = require('stripe');

admin.initializeApp();

const geminiApiKey = defineString("GEMINI_API_KEY");
const emailUser = defineString("EMAIL_USER");
const emailPassword = defineString("EMAIL_USER");
// NEW STRIPE SECRET (must be set via CLI: firebase functions:secrets:set STRIPE_SECRET_KEY)
const stripeSecretKey = defineString("STRIPE_SECRET_KEY");

// Initialize Google Auth for Vertex AI (Uses the function's service account)
const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// CRITICAL: The region where the function is deployed and the Vertex AI call is made
const DEPLOY_REGION = "asia-southeast1"; 

exports.generateQuote = onCall({ region: DEPLOY_REGION, timeoutSeconds: 120, memory: "1GiB" }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const { audioBase64, type, mimeType } = request.data;
  // NEW: Get the default items logic from the frontend request
  const useDefaults = request.data.useDefaults || false;
  let defaultItemsPrompt = '';

  if (useDefaults && request.data.defaultItems && request.data.defaultItems.length > 0) {
      defaultItemsPrompt = `
        \n### DEFAULT ITEMS FOR PRICING BIASING:
        The user has pre-set the following line items. If similar work is mentioned, try to use these descriptions, quantities, and prices:
        ${JSON.stringify(request.data.defaultItems, null, 2)}
      `;
  }
  // END NEW LOGIC
  if (type !== 'rewrite' && !audioBase64) throw new HttpsError('invalid-argument', 'No audio.');

  // CRITICAL FIX: Use the stable 2.5 model
  const MODEL_NAME = "gemini-2.5-flash"; 
  const PROJECT_ID = "talk2quote-app"; 

  // Vertex AI URL MUST match the region
  const VERTEX_URL = `https://${DEPLOY_REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${DEPLOY_REGION}/publishers/google/models/${MODEL_NAME}:generateContent`;

  let apiBody;
  
  // Prepare audio data for the call
  const audioPart = {
      inlineData: {
          mimeType: mimeType || "audio/webm; codecs=opus", 
          data: audioBase64
      }
  };

  if (type === 'rewrite') {
      apiBody = {
        contents: [{ role: "user", parts: [{ text: `Rewrite this professionally: ${request.data.transcript}` }] }]
      };
  } else {
      const systemContext = `
        You are an expert Australian trade estimator.

        ### ACCENT AND TERMINOLOGY BIASING:
        1. **PRIORITIZE:** When transcribing, strongly prioritize construction terms like 'repair', 'remedial', 'brickwork', 'concrete', 'excavation' over similar sounding words (e.g., 'repair' over 'prepare', 'brick' over 'break').
        2. **ACCENTS:** The speaker may have a strong French or Australian accent. Use phonetic matching for suburbs.

        ### ADDRESS AND TERM RULES:
        3. **ADDRESSES:** Format addresses as: "Street Number & Name, Suburb State Postcode". Prioritize NSW, VIC, QLD suburbs.
        4. **TERMS:** Expect terms like 'Reno', 'Rough in', 'GPO', 'Cornice', 'Skirting', 'Gyprock'.

        Return ONLY raw JSON with this structure:
        {
          "clientName": "String",
          "clientAddress": "String",
          "scopeOfWork": "String",
          "items": [
            { "id": 1, "description": "String", "qty": Number, "price": Number }
          ]
        }
        If price is not mentioned, set to 0.
        ${defaultItemsPrompt}
        `;

      apiBody = {
        contents: [
            { role: "user", parts: [{ text: systemContext }, audioPart] }
        ]
      };
  }
  
  try {
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const response = await fetch(VERTEX_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`
      },
      body: JSON.stringify(apiBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Vertex AI Failure:", { status: response.status, body: errorText });
      throw new HttpsError('internal', `Vertex AI Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) throw new HttpsError('internal', 'AI returned empty response');

    if (type === 'rewrite') return { rewrittenText: generatedText };

    try {
      const cleanJson = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      return { clientName: "", clientAddress: "", scopeOfWork: generatedText, items: [] }; 
    }

  } catch (error) {
    logger.error("Crash:", error);
    throw new HttpsError('internal', error.message);
  }
});

exports.sendQuoteEmail = onCall({ region: DEPLOY_REGION }, async (request) => {
    return { success: true };
});

exports.createStripeCheckoutSession = onCall({ region: DEPLOY_REGION }, async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

    const { planId, priceId } = request.data;

    if (!planId || !priceId) {
        throw new HttpsError('invalid-argument', 'Missing plan or price ID.');
    }

    // Initialize Stripe with the secret key (MUST be set via CLI: firebase functions:secrets:set STRIPE_SECRET_KEY)
    const stripeInstance = require('stripe')(stripeSecretKey.value());
    const YOUR_DOMAIN = 'https://talk2quote-app.web.app'; // Use your live Firebase Hosting URL

    try {
        // Find or create customer
        let customer;
        const customers = await stripeInstance.customers.list({ email: request.auth.token.email, limit: 1 });
        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripeInstance.customers.create({
                email: request.auth.token.email,
                metadata: {
                    firebaseUid: request.auth.uid
                }
            });
        }

        // Create Checkout Session
        const session = await stripeInstance.checkout.sessions.create({
            mode: 'subscription',
            customer: customer.id,
            line_items: [{
                price: priceId, // Stripe Price ID for Pro/Enterprise
                quantity: 1,
            }],
            success_url: `${YOUR_DOMAIN}/?status=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${YOUR_DOMAIN}/?status=cancelled`,
            metadata: {
                firebaseUid: request.auth.uid,
                planId: planId
            },
        });

        return { sessionId: session.id, url: session.url };

    } catch (error) {
        console.error("Stripe Error:", error);
        throw new HttpsError('internal', `Stripe checkout failed: ${error.message}`);
    }
});