// Test this file first: node sendOTP.js
// Place in server/ folder
console.log('API KEY:', BREVO_API_KEY.substring(0, 20));
const https = require('https');

const BREVO_API_KEY = 'xsmtpsib-24b290de3349d10c185161e75723de5739544e6d1b790d200f9eb36e1605d6f2-w3Dqg1aWBbefsCdh'; // Get from Brevo → SMTP & API → API Keys tab
const TO_EMAIL      = 'divyaalat1711@gmail.com';
const OTP           = '123456';

const data = JSON.stringify({
  sender:  { name: 'SheCare', email: 'alatdivya17@gmail.com' },
  to:      [{ email: TO_EMAIL }],
  subject: 'Your SheCare OTP',
  htmlContent: `<h2>Your OTP is: <b>${OTP}</b></h2><p>Valid for 10 minutes.</p>`,
});

const options = {
  hostname: 'api.brevo.com',
  path:     '/v3/smtp/email',
  method:   'POST',
  headers:  {
    'accept':       'application/json',
    'api-key':      BREVO_API_KEY,
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(data),
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    if (res.statusCode === 201) {
      console.log('✅ EMAIL SENT SUCCESSFULLY');
    } else {
      console.log('❌ FAILED:', res.statusCode, body);
    }
  });
});

req.on('error', e => console.log('❌ ERROR:', e.message));
req.write(data);
req.end();