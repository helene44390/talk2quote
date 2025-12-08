require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 1. Setup Auth
const keyPath = path.resolve(process.cwd(), 'firebase-key.json');
if (!fs.existsSync(keyPath)) {
  console.error(`❌ CRITICAL ERROR: 'firebase-key.json' is missing from the root folder.`);
  console.error(`   Action Required: Go to your Firebase project settings, generate a new private key, and place it in the root of this project as 'firebase-key.json'.`);
  process.exit(1);
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
console.log('🔒 Authenticated with Service Account.');

// 2. Set the API Key (Crucial Step)
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is not set in the .env file!');
  process.exit(1);
}
console.log('⚙️ Setting API Key config...');

try {
  execSync(`npx firebase-tools functions:config:set gemini.api_key="${API_KEY}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: keyPath
    }
  });
  console.log('✅ Config set successfully.');
} catch (e) {
  console.error('⚠️ Warning: Failed to set config (might already be set). Continuing...');
}

// 3. Deploy using CLI
console.log('🚀 Deploying Functions...');
try {
  execSync('npx firebase-tools deploy --only functions --force', {
    stdio: 'inherit',
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: keyPath
    }
  });
  console.log('✅ BACKEND DEPLOYED SUCCESSFULLY!');
} catch (e) {
  console.error('❌ Deploy Failed');
  process.exit(1);
}
