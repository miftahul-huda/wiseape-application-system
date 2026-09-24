const menusService = require('../services/menusService');

async function list(req, res, next) {
  try {
    res.json(await menusService.getMenuTree());
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
