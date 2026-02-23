// This script simulates what GAS would do when sending data
const https = require('https');

const data = JSON.stringify({
  "name": "手動連携テスト太郎",
  "email": "simulator-test@example.com",
  "phone": "090-0000-0000",
  "message": "GASの手動実行テスト",
  "type": "trial"
});

const options = {
  hostname: 'manager.swim-partners.com',
  path: '/api/webhooks/onboarding',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
