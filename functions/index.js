const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const cors = require("cors")({origin: true});
admin.initializeApp();

exports.generateQuote = functions.https.onCall(async (data, context) => {
  try {
    const { transcript, type } = data;

    if (!transcript) {
      throw new functions.https.HttpsError('invalid-argument', 'transcript is required');
    }

    // 1. Get the API Key from the config (Gen 1 style)
    const apiKey = functions.config().gemini.api_key;
    if (!apiKey) {
      console.error("CRITICAL ERROR: functions.config().gemini.api_key is missing.");
      throw new functions.https.HttpsError('failed-precondition', 'API Key not configured.');
    }

    let prompt = '';
    if (type === 'rewrite') {
      prompt = `You are a professional business writer. Rewrite the following quote scope summary to be more professional, clear, and well-structured. Keep all important details but improve the language and formatting.

Scope Summary to Rewrite: ${transcript}

Return ONLY the rewritten text, nothing else.`;
    } else {
      prompt = `You are an AI assistant that converts spoken quotes into structured quote data for a quoting app.

Extract the following information from the transcript and return it as valid JSON:

scopeSummary: A professional summary of the work to be done

items: An array of line items, each with:

id: sequential number starting from 1

description: what the item is

qty: quantity (number)

price: unit price (number)

Transcript: ${transcript}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "scopeSummary": "summary here",
  "items": [
    {"id": 1, "description": "item description", "qty": 1, "price": 100}
  ]
}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", response.status, errorText);
      throw new functions.https.HttpsError('internal', `Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new functions.https.HttpsError('internal', 'Invalid response from Gemini API');
    }

    const generatedText = result.candidates[0].content.parts[0].text;

    if (type === 'rewrite') {
      return { rewrittenText: generatedText.trim() };
    } else {
      let cleanedText = generatedText.trim();
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      try {
        const parsed = JSON.parse(cleanedText);
        return {
          scopeSummary: parsed.scopeSummary || '',
          items: parsed.items || []
        };
      } catch (parseError) {
        return {
          scopeSummary: generatedText,
          items: [
            { id: 1, description: 'Generated item - please edit', qty: 1, price: 0 }
          ]
        };
      }
    }
  } catch (error) {
    console.error("Error in generateQuote:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.sendQuoteEmail = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { recipientEmail, recipientName, quoteData, pdfBase64, companyDetails, bccEmail } = data;

    if (!recipientEmail || !quoteData) {
      throw new functions.https.HttpsError('invalid-argument', 'recipientEmail and quoteData are required');
    }

    // Get Email Credentials from Config (Gen 1 style)
    const emailUser = functions.config().email ? functions.config().email.user : null;
    const emailPass = functions.config().email ? functions.config().email.password : null;

    if (!emailUser || !emailPass) {
      console.error("Email configuration missing.");
      throw new functions.https.HttpsError('failed-precondition', 'Email configuration not set');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const total = quoteData.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const companyName = companyDetails?.name || 'Talk2Quote';
    const approvalLink = `https://talk2quote-app.web.app`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .quote-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: bold; }
    .total { font-size: 24px; font-weight: bold; color: #10b981; text-align: right; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Your Quote is Ready</p>
    </div>
    <div class="content">
      <p>Hi ${recipientName || 'Valued Client'},</p>
      <p>Thank you for your interest! Please find your quote details below:</p>

      <div class="quote-details">
        <h2>Quote #${quoteData.id}</h2>
        <p><strong>Date:</strong> ${quoteData.date || new Date().toLocaleDateString()}</p>
        <p><strong>Job Address:</strong> ${quoteData.jobAddress || 'As discussed'}</p>

        ${quoteData.scopeSummary ? `
        <h3>Scope of Work</h3>
        <p>${quoteData.scopeSummary}</p>
        ` : ''}

        <h3>Line Items</h3>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${quoteData.items.map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.qty}</td>
              <td>$${item.price.toFixed(2)}</td>
              <td>$${(item.qty * item.price).toFixed(2)}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          Total: $${total.toFixed(2)}
        </div>
      </div>

      <center>
        <a href="${approvalLink}" class="button">View & Approve Quote</a>
      </center>

      <p style="margin-top: 30px;">The attached PDF contains the full quote details. If you have any questions, please don't hesitate to contact us.</p>

      <p>Best regards,<br>${companyName}</p>
    </div>
    <div class="footer">
      <p>This quote is valid for 30 days from the date of issue.</p>
      <p>Powered by Talk2Quote App</p>
    </div>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `${companyName} <${emailUser}>`,
      to: recipientEmail,
      subject: `Quote #${quoteData.id} from ${companyName}`,
      html: emailHtml,
      attachments: []
    };

    if (bccEmail) {
      if (Array.isArray(bccEmail)) {
        mailOptions.bcc = bccEmail.join(', ');
      } else {
        mailOptions.bcc = bccEmail;
      }
    }

    if (pdfBase64) {
      mailOptions.attachments.push({
        filename: `Quote_${quoteData.id}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      });
    }

    await transporter.sendMail(mailOptions);

    return { success: true, message: 'Email sent successfully' };

  } catch (error) {
    console.error("Error sending email:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});
