import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Locate the Key File
const keyFileName = 'firebase-key.json';
const keyPath = path.resolve(__dirname, keyFileName);

console.log(`🔒 Authenticating with: ${keyPath}`);

if (!fs.existsSync(keyPath)) {
  console.error(`❌ ERROR: ${keyFileName} not found! Please upload it.`);
  process.exit(1);
}

// 2. Prepare the Environment (Force-feeding the key)
const deployEnv = {
  ...process.env,
  GOOGLE_APPLICATION_CREDENTIALS: keyPath
};

try {
  // 3. Build First
  console.log('📦 Building app...');
  execSync('npm run build', { stdio: 'inherit' });

  // 4. Deploy using the Explicit Environment
  console.log('🚀 Deploying to Firebase...');
  // We use the local npx path to avoid shell interference
  execSync('npx firebase-tools deploy --only hosting --force', {
    stdio: 'inherit',
    env: deployEnv  // <--- THIS IS THE FIX
  });

  console.log('✅ Deployment Complete!');
} catch (error) {
  console.error('❌ Failed to deploy.');
  process.exit(1);
}
