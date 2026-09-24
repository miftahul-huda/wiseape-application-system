const themesService = require('../services/themesService');

async function list(req, res, next) {
  try {
    res.json({ themes: await themesService.listThemes() });
  } catch (error) {
    next(error);
  }
}

module.exports = { list };
