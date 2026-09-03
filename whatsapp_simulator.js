const http = require('http');

/**
 * WhatsApp Webhook Simulator
 * 
 * Run this script to simulate incoming WhatsApp messages to your local Next.js server.
 * Usage: node whatsapp_simulator.js "hello"
 */

const args = process.argv.slice(2);
const messageText = args.join(' ') || "hello";

// Simulated Meta Webhook Payload
const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "TEST_WABA_ID",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "15556668504",
              phone_number_id: "1244537102079968"
            },
            contacts: [
              {
                profile: {
                  name: "Test User"
                },
                wa_id: "917207071874" // Sending from the user's real number to simulate their phone
              }
            ],
            messages: [
              {
                from: "917207071874",
                id: "wamid.HBgLOTE3MjA3MDcxODc0FQIAEhgUMzNFQUIwMjBCMUZGRDQ3QzJBNUMAA",
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: {
                  body: messageText
                },
                type: "text"
              }
            ]
          },
          field: "messages"
        }
      ]
    }
  ]
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/whatsapp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    if (body) {
      console.log(`RESPONSE: ${body}`);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  console.error('Make sure Next.js is running on http://localhost:3000');
});

// Write data to request body
req.write(data);
req.end();

console.log(`🚀 Simulated sending WhatsApp message: "${messageText}" from +91 72070 71874`);
