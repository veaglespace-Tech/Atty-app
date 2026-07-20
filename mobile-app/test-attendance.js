const axios = require('axios');
axios.get('http://localhost:5001/api/super-admin/attendance/reports')
  .then(res => console.log(JSON.stringify(res.data.items[0], null, 2)))
  .catch(err => console.error(err.message));
