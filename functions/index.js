const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");

admin.initializeApp();

exports.generateQuote = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { text } = req.body;

      const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini.api_key;

      if (!apiKey) {
        res.status(500).send({ error: "API Key not configured" });
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
        }
      );

      const data = await response.json();
      res.status(200).send(data);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      res.status(500).send({ error: error.message });
    }
  });
});
