const db = require('../../config/db');

const FALLBACK_APPS = [
  {
    appID: 'helloWorld',
    appTitle: 'HelloWorld',
    appVersion: '1.0.0',
    appDeveloper: 'Wiseape',
    appIcon: '✦',
    appLibraries: ['Wiseape WAS'],
    appConfig: { theme: 'light', mode: 'starter' },
    appStartPoint: 'applications/HelloWorld/AppHelloWorld.js:AppHelloWorld',
    appParameter: { message: 'Hello World' },
  },
  {
    appID: 'settings',
    appTitle: 'Settings',
    appVersion: '1.0.0',
    appDeveloper: 'Wiseape',
    appIcon: '⚙',
    appLibraries: ['Wiseape WAS'],
    appConfig: {},
    appStartPoint: 'applications/Settings/AppSettings.js:AppSettings',
    appParameter: {},
  },
  {
    appID: 'controls',
    appTitle: 'Controls',
    appVersion: '1.0.0',
    appDeveloper: 'Wiseape',
    appIcon: '🎛',
    appLibraries: ['Wiseape WAS'],
    appConfig: {},
    appStartPoint: 'applications/Controls/AppControls.js:AppControls',
    appParameter: {},
  },
];

function parseJsonField(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value) || typeof value === 'object') return value;
  try {
    return JSON.parse(value) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

let adminAppSeeded = false;

async function ensureAdminAppSeeded() {
  if (adminAppSeeded) return;

  const existing = await db.query('SELECT 1 FROM wiseape_apps WHERE app_id = $1', ['admin']);
  if (existing.rowCount === 0) {
    await db.query(
      `INSERT INTO wiseape_apps (app_id, app_title, app_version, app_developer, app_icon, app_libraries, app_config, app_start_point, app_parameter)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        'admin',
        'Admin',
        '1.0.0',
        'Wiseape',
        '🛡',
        JSON.stringify(['Wiseape WAS']),
        JSON.stringify({}),
        'applications/Admin/AppAdmin.js:AppAdmin',
        JSON.stringify({}),
      ]
    );
  }

  adminAppSeeded = true;
}

async function listApplications() {
  try {
    await ensureAdminAppSeeded();
    const result = await db.query(`
      SELECT app_id AS "appID", app_title AS "appTitle", app_version AS "appVersion",
             app_developer AS "appDeveloper", app_icon AS "appIcon", app_libraries AS "appLibraries",
             app_config AS "appConfig", app_start_point AS "appStartPoint", app_parameter AS "appParameter"
      FROM wiseape_apps
      ORDER BY app_title ASC
    `);

    if (result.rowCount === 0) return FALLBACK_APPS.map((app) => ({ ...app }));

    return result.rows.map((row) => ({
      ...row,
      appIcon: row.appIcon || '◫',
      appLibraries: parseJsonField(row.appLibraries, []),
      appConfig: parseJsonField(row.appConfig, {}),
      appParameter: parseJsonField(row.appParameter, {}),
    }));
  } catch (error) {
    console.warn('[WAS API] wiseape_apps unavailable, using fallback list:', error.message);
    return FALLBACK_APPS.map((app) => ({ ...app }));
  }
}

async function findById(appId) {
  const apps = await listApplications();
  return apps.find((app) => String(app.appID) === String(appId)) || null;
}

module.exports = { listApplications, findById };
