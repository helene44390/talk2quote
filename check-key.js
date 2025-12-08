const fs = require('fs');
const path = require('path');

const keyFileName = 'firebase-key.json';
const keyPath = path.resolve(process.cwd(), keyFileName);

if (!fs.existsSync(keyPath)) {
  console.error(`❌ CRITICAL ERROR: '${keyFileName}' is missing from the root folder.`);
  console.error(`   Action Required: Go to your Firebase project settings, generate a new private key, and place it in the root of this project as '${keyFileName}'.`);
  process.exit(1);
}
