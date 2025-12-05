const client = require('firebase-tools');
const path = require('path');
const fs = require('fs');
const keyPath = path.resolve(process.cwd(), 'firebase-key.json');

if (!fs.existsSync(keyPath)) { console.error('❌ Error: firebase-key.json is missing!'); process.exit(1); }

console.log('🔒 Authenticating via Service Account Key...'); process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;

(async () => { try { await client.deploy({ project: 'talk2quote-app', only: 'functions', force: true, cwd: process.cwd() }); console.log('✅ BACKEND DEPLOYED SUCCESSFULLY!'); } catch (e) { console.error('❌ Deploy Failed:', e); process.exit(1); } })();
