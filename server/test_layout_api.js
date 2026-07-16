require('dotenv').config();
const jwt = require('jsonwebtoken');

async function main() {
  const token = jwt.sign(
    { id: 1, email: "admin@example.com", role: "ADMIN", orgId: 1 },
    process.env.JWT_KEY || 'defaultsecret',
    { expiresIn: '1h' }
  );
  
  const headers = { 'Authorization': `Bearer ${token}` };

  const endpoints = [
    '/api/org/notifications?page=1',
    '/api/org/registration-requests',
    '/api/org/regularization-requests'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:5000${ep}`, { headers });
      console.log(ep, "-> STATUS:", res.status);
      if (res.status >= 400) {
        console.log("ERROR BODY:", await res.text());
      }
    } catch (e) {
      console.error(ep, "-> NETWORK ERROR:", e.message);
    }
  }
}
main();
