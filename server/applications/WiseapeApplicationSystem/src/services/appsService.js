const appsModel = require('../models/appsModel');

async function listApps() {
  return appsModel.listApplications();
}

async function findById(appId) {
  return appsModel.findById(appId);
}

module.exports = { listApps, findById };
