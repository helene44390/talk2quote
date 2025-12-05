const client = require('firebase-tools');
const path = require('path');
const fs = require('fs');

// 1. Find the Key
const keyPath = path.resolve(process.cwd(), 'firebase-key.json');

if (!fs.existsSync(keyPath)) {
  console.error('❌ ERROR: firebase-key.json is missing. Please upload it.');
  process.exit(1);
}

// 2. Set Auth Variable
console.log('🔒 Authenticating via Key File...');
process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

// 3. Deploy Programmatically
(async () => {
  try {
    console.log('🚀 Starting Deployment...');
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
