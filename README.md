# Talk2Quote App

A professional quote generation app with voice-to-text capabilities powered by Google Gemini AI.

## Features

- Voice-to-text quote generation
- AI-powered quote formatting and enhancement
- Firebase Authentication
- Supabase database integration
- Stripe payment integration
- PDF quote generation and sharing

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase Cloud Functions

The Gemini API calls are handled securely through Firebase Cloud Functions to protect your API key.

#### Install Functions Dependencies

```bash
npm run setup:functions
```

#### Configure Gemini API Key

Set your Gemini API key as a Firebase environment variable:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY_HERE"
```

Your current Gemini API key: `AIzaSyColDUivAUv5w1Bkh151PMGn3FkH6iJoc0`

#### Deploy Functions

```bash
npm run deploy:functions
```

Or manually:

```bash
firebase deploy --only functions
```

### 3. Build the App

```bash
npm run build
```

### 4. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Or deploy everything:

```bash
firebase deploy
```

## Development

```bash
npm run dev
```

## Environment Variables

The following environment variables are configured in `.env`:

- `FIREBASE_WEB_API_KEY` - Firebase Web API key
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Security

- The Gemini API key is stored securely in Firebase Cloud Functions environment configuration
- API calls to Gemini are made from the backend, not exposed in the frontend
- Firebase Authentication is required to use AI features
- Stripe payments are processed through Supabase Edge Functions with Firebase token verification

## Cloud Functions

See `functions/README.md` for detailed information about the Firebase Cloud Functions.
