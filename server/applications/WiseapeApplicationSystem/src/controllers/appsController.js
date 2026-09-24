const appsService = require('../services/appsService');

async function list(req, res, next) {
  try {
    res.json(await appsService.listApps());
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
