import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Find the Key File (Absolute Path)
const keyFileName = 'firebase-key.json';
const keyPath = path.resolve(__dirname, keyFileName);

console.log(`🔒 Checking for credentials at: ${keyPath}`);

if (!fs.existsSync(keyPath)) {
  console.error(`❌ ERROR: ${keyFileName} is missing! You must drag it into the file explorer.`);
  process.exit(1);
}

// 2. Set the Environment Variable securely
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

try {
  // 3. Build
  console.log('📦 Building app...');
  execSync('npm run build', { stdio: 'inherit' });

  // 4. Deploy (Hosting Only)
  console.log('🚀 Deploying to Firebase...');
  execSync('npx firebase-tools deploy --only hosting --force', {
    stdio: 'inherit',
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: keyPath }
  });

  console.log('✅ Success! App is live.');
} catch (error) {
  console.error('❌ Deployment failed.');
  process.exit(1);
}
