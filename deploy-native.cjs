const client = require('firebase-tools');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 1. Setup Auth
const keyPath = path.resolve(process.cwd(), 'firebase-key.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ Error: firebase-key.json is missing!');
  process.exit(1);
}
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
console.log('🔒 Authenticated with Service Account.');

// 2. Set the API Key (Crucial Step)
const API_KEY = "AIzaSyColDUivAUv5w1Bkh151PMGn3FkH6iJoc0"; // Your Gemini Key
console.log('⚙️ Setting API Key config...');

try {
  // We use execSync for the config command because it's faster/simpler for single commands
  execSync(`npx firebase-tools functions:config:set gemini.api_key="${API_KEY}"`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: keyPath
    }
  });
} catch (e) {
  console.error('⚠️ Warning: Failed to set config (might already be set). Continuing...');
}

// 3. Deploy
(async () => {
  try {
    console.log('🚀 Deploying Functions...');
    await client.deploy({
      project: 'talk2quote-app',
      only: 'functions',
      force: true,
      cwd: process.cwd()
    });
    console.log('✅ BACKEND DEPLOYED SUCCESSFULLY!');
  } catch (e) {
    console.error('❌ Deploy Failed:', e);
    process.exit(1);
  }
})();
