require('dotenv').config();
const sendEmail = require('./utils/email');

async function test() {
  try {
    const res = await sendEmail({
      email: 'singareakshay937@gmail.com', 
      subject: 'Fallback Verification Test',
      message: 'This is a test to verify automatic fallback when the primary email fails.'
    });
    console.log('Email successfully sent! Result:', res);
  } catch (err) {
    console.error('Final email failure:', err);
  }
}
test();
