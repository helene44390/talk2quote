import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import https from 'https';

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

// 2. Read the service account key
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

// 3. Generate JWT and get access token
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now
  };

  // Import crypto for signing
  const crypto = await import('crypto');

  const base64url = (str) => {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  sign.end();

  const signature = sign.sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString();

    const options = {
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          resolve(response.access_token);
        } else {
          reject(new Error(`Failed to get access token: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

try {
  // 3. Build
  console.log('📦 Building app...');
  execSync('npm run build', { stdio: 'inherit' });

  // 4. Get access token
  console.log('🔑 Authenticating with service account...');
  const token = await getAccessToken();

  // 5. Deploy with token
  console.log('🚀 Deploying to Firebase...');
  execSync(`npx firebase-tools deploy --only hosting --force --token "${token}"`, {
    stdio: 'inherit',
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: keyPath }
  });

  console.log('✅ Success! App is live.');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
