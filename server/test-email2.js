require('dotenv').config();
const sendEmail = require('./utils/email');

async function test() {
  try {
    const res = await sendEmail({
      email: 'akshay@veaglespace.com', 
      subject: 'Test Email 2',
      message: 'This is a test 2'
    });
    console.log('--- SUCCESS RESULT ---');
    console.log(res);
  } catch (err) {
    console.error('--- FINAL FAILURE RESULT ---');
    console.error(err);
  }
}
test();
