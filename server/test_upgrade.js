const { extendSuperAdminOrganizationPlan } = require('./controllers/super-admin.controller');

const req = {
  params: { organizationId: '1' },
  body: { additionalDays: 30, planCode: 'PREMIUM' },
  user: { id: 1 }
};

const res = {
  status: (code) => { console.log('Status:', code); return res; },
  json: (data) => console.log('Response:', data)
};

extendSuperAdminOrganizationPlan(req, res).catch(console.error);
