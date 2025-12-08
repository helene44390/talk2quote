import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Locate the Key File (Absolute Path)
const keyFileName = 'firebase-key.json';
const keyPath = path.resolve(process.cwd(), keyFileName);

console.log('🔒 Authentication Mode: Service Account');
console.log(`🔑 Key Path: ${keyPath}`);

// 2. Verify the file exists
if (!fs.existsSync(keyPath)) {
  console.error(`❌ CRITICAL ERROR: '${keyFileName}' is missing from the root folder.`);
  console.error(`   Action Required: Go to your Firebase project settings, generate a new private key, and place it in the root of this project as '${keyFileName}'.`);
  process.exit(1);
}

// 3. Construct the Environment Object
// We clone the current environment and FORCE the credential variable in.
const deployEnv = {
  ...process.env,
  GOOGLE_APPLICATION_CREDENTIALS: keyPath
};

try {
  // 4. Build the App
  console.log('📦 Building app...');
  execSync('npm run build', { stdio: 'inherit' });

  // 5. Deploy with Explicit Environment
  console.log('🚀 Deploying to Firebase (Hosting Only)...');

  // NOTICE: We pass 'env: deployEnv' to ensure the key is NOT stripped.
  execSync('npx firebase-tools deploy --only hosting --force', {
    stdio: 'inherit',
    env: deployEnv
  });

  console.log('✅ DEPLOYMENT SUCCESSFUL!');
} catch (error) {
  console.error('❌ Deployment failed. Check the logs above.');
  process.exit(1);
}
