const themesModel = require('../models/themesModel');

async function listThemes() {
  return themesModel.listThemes();
}

function getThemeById(themes, themeId) {
  return themes.find((theme) => theme.id === themeId) || themes[0] || null;
}

module.exports = { listThemes, getThemeById };
