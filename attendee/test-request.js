const http = require('http');

const req = http.request({
  hostname: '10.144.201.139',
  port: 5000,
  path: '/api/member/attendance?limit=100',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTcsIm5hbWUiOiJyaXRlc2giLCJlbWFpbCI6InJpdGVzaEBnbWFpbC5jb20iLCJwZXJtaXNzaW9ucyI6WyJhdHRlbmRhbmNlX3ZpZXciXSwicm9sZSI6Ik1FTUJFUiIsIm9yZ0lkIjoxLCJpYXQiOjE3ODQwMjI5MDUsImV4cCI6MTc4NDEwOTMwNX0.-E23U26DtUEcyIGEytT3gTXeTkbvRC-2VS6BL2ZHD4s'
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(`BODY: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.setTimeout(15000, () => {
    console.log("TIMEOUT");
    req.destroy();
});
req.end();
