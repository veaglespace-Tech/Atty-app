require('dotenv').config();
const jwt = require('jsonwebtoken');

async function main() {
  const token = jwt.sign(
    { id: 1, email: "admin@example.com", role: "ADMIN", orgId: 1 },
    process.env.JWT_KEY || 'defaultsecret',
    { expiresIn: '1h' }
  );
  
  const res = await fetch('http://localhost:5000/api/posts?authorId=1', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const text = await res.text();
  console.log("STATUS:", res.status);
  console.log("RESPONSE:", text);
}
main();
