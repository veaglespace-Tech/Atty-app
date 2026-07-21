const { exportAllSuperAdminUsersExcel } = require('./controllers/super-admin.controller.js');
const req = {};
const res = {
  setHeader: console.log,
  status: (code) => ({
    send: (data) => console.log('Status', code, 'Data length', data.length)
  })
};
exportAllSuperAdminUsersExcel(req, res).catch(console.error);
