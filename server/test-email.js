require('dotenv').config();
const sendEmail = require('./utils/email');

async function test() {
  try {
    const res = await sendEmail({
      email: 'akshay@veaglespace.com', 
      subject: 'Test Email',
      message: 'This is a test'
    });
    console.log('Email successfully sent! Result:', res);
  } catch (err) {
    console.error('Final email failure:', err);
  }
}
test();
