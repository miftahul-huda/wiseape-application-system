const db = require('../../config/db');

const FALLBACK_MENUS = [
  { id: 1, parentId: null, type: 'group', label: 'Demos', icon: null, appId: null, sortOrder: 0 },
  { id: 2, parentId: 1, type: 'item', label: 'HelloWorld', icon: null, appId: 'helloWorld', sortOrder: 0 },
  { id: 3, parentId: 1, type: 'item', label: 'Controls', icon: null, appId: 'controls', sortOrder: 1 },
  { id: 4, parentId: null, type: 'item', label: 'Settings', icon: null, appId: 'settings', sortOrder: 1 },
];

let schemaReady = false;

async function ensureSchema() {
  if (schemaReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS wiseape_menus (
      menu_id SERIAL PRIMARY KEY,
      parent_id INTEGER REFERENCES wiseape_menus(menu_id) ON DELETE CASCADE,
      menu_type TEXT NOT NULL DEFAULT 'item',
      label TEXT NOT NULL,
      icon TEXT,
      app_id TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  const countResult = await db.query('SELECT COUNT(*)::int AS count FROM wiseape_menus');
  if (countResult.rows[0].count === 0) {
    const groupResult = await db.query(
      `INSERT INTO wiseape_menus (parent_id, menu_type, label, icon, app_id, sort_order)
       VALUES (NULL, 'group', 'Demos', NULL, NULL, 0) RETURNING menu_id`
    );
    const groupId = groupResult.rows[0].menu_id;

    await db.query(
      `INSERT INTO wiseape_menus (parent_id, menu_type, label, icon, app_id, sort_order) VALUES
       ($1, 'item', 'HelloWorld', NULL, 'helloWorld', 0),
       ($1, 'item', 'Controls', NULL, 'controls', 1)`,
      [groupId]
    );

    await db.query(
      `INSERT INTO wiseape_menus (parent_id, menu_type, label, icon, app_id, sort_order)
       VALUES (NULL, 'item', 'Settings', NULL, 'settings', 1)`
    );
  }

  schemaReady = true;
}

let adminMenuSeeded = false;

async function ensureAdminMenuSeeded() {
  if (adminMenuSeeded) return;

  const existing = await db.query('SELECT 1 FROM wiseape_menus WHERE app_id = $1', ['admin']);
  if (existing.rowCount === 0) {
    await db.query(
      `INSERT INTO wiseape_menus (parent_id, menu_type, label, icon, app_id, sort_order)
       VALUES (NULL, 'item', 'Admin', NULL, 'admin', 2)`
    );
  }

  adminMenuSeeded = true;
}

async function listMenus() {
  try {
    await ensureSchema();
    await ensureAdminMenuSeeded();
    const result = await db.query(
      `SELECT menu_id AS id, parent_id AS "parentId", menu_type AS type, label, icon, app_id AS "appId", sort_order AS "sortOrder"
       FROM wiseape_menus
       ORDER BY parent_id NULLS FIRST, sort_order ASC, label ASC`
    );
    return result.rows;
  } catch (error) {
    console.warn('[WAS API] wiseape_menus unavailable, using fallback list:', error.message);
    return FALLBACK_MENUS.map((menu) => ({ ...menu }));
  }
}

module.exports = { listMenus };
