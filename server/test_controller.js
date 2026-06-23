const httpMocks = require('node-mocks-http');
const { generateDatabaseBackup } = require('./controllers/super-admin.controller');
const fs = require('fs');

async function testBackup() {
  const req = httpMocks.createRequest({
    method: 'GET',
    url: '/backup/download'
  });

  const res = httpMocks.createResponse({
    eventEmitter: require('events').EventEmitter
  });

  res.on('end', () => {
    console.log("Response ended");
    const data = res._getData();
    fs.writeFileSync('test_backup.zip', data);
    console.log("Zip written. Status:", res._getStatusCode());
  });

  try {
    await generateDatabaseBackup(req, res);
    console.log("Controller executed");
  } catch (e) {
    console.error("Controller Error:", e);
  }
}

testBackup();
