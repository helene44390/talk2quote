# Firebase Cloud Functions Setup

This directory contains the Firebase Cloud Functions for the Talk2Quote app.

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment Variables

The Gemini API key needs to be configured as a Firebase environment variable:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Gemini API key (currently: `AIzaSyColDUivAUv5w1Bkh151PMGn3FkH6iJoc0`).

### 3. Deploy the Functions

```bash
firebase deploy --only functions
```

Or deploy from the project root:

```bash
npm run deploy
# Or
firebase deploy --only functions
```

## Functions

### `generateQuote`

A callable HTTPS function that processes transcripts using Google's Gemini AI.

**Parameters:**
- `transcript` (string): The audio transcript or text to process
- `type` (string): Either "quote" or "rewrite"
  - "quote": Generates a structured quote from a transcript
  - "rewrite": Rewrites/enhances existing scope summary text

**Returns:**
- For "quote" type: `{ scopeSummary, items[] }`
- For "rewrite" type: `{ rewrittenText }`

**Authentication:**
- Requires Firebase Authentication

## Local Development

To test functions locally:

```bash
firebase emulators:start --only functions
```

## Security

The Gemini API key is stored securely in Firebase environment configuration and is never exposed to the frontend.
