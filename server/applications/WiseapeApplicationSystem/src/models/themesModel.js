const db = require('../../config/db');

const FALLBACK_THEMES = [
  { id: 'macos-light', name: 'macOS Light', bg1: '#a4bfd5', bg2: '#d9e9f7', accent: '#3b82f6', accentDark: '#1d4ed8' },
  { id: 'light-blue', name: 'Light Blue', bg1: '#bfe3ff', bg2: '#eaf6ff', accent: '#0ea5e9', accentDark: '#0284c7' },
  { id: 'midnight', name: 'Midnight', bg1: '#1e293b', bg2: '#0f172a', accent: '#8b5cf6', accentDark: '#6d28d9' },
  { id: 'sunset', name: 'Sunset', bg1: '#fb923c', bg2: '#db2777', accent: '#f97316', accentDark: '#c2410c' },
  { id: 'forest', name: 'Forest', bg1: '#4ade80', bg2: '#064e3b', accent: '#16a34a', accentDark: '#166534' },
];

async function listThemes() {
  try {
    const result = await db.query(`
      SELECT theme_id AS id, theme_name AS name, bg1, bg2, accent, accent_dark AS "accentDark"
      FROM wiseape_themes
      ORDER BY theme_name ASC
    `);
    if (result.rowCount === 0) return FALLBACK_THEMES.map((theme) => ({ ...theme }));
    return result.rows;
  } catch (error) {
    console.warn('[WAS API] wiseape_themes unavailable, using fallback list:', error.message);
    return FALLBACK_THEMES.map((theme) => ({ ...theme }));
  }
}

module.exports = { listThemes };
