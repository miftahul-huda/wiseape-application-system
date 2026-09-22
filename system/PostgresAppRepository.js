const { Client } = require('pg');

const fallbackApps = [
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

class PostgresAppRepository {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST,
      database: config.database || process.env.DB_NAME || 'wiseape-application-system',
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      port: config.port || process.env.DB_PORT || 5432,
      ssl: config.ssl !== undefined ? config.ssl : { rejectUnauthorized: false },
      ...config,
    };
  }

  getFallbackApps() {
    return fallbackApps.map((app) => ({ ...app }));
  }

  parseJsonField(value, fallback = []) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed ?? fallback;
      } catch (error) {
        return value ? [value] : fallback;
      }
    }

    return value ?? fallback;
  }

  async connect() {
    if (!this.client) {
      this.client = new Client(this.config);
      await this.client.connect();
    }
    return this.client;
  }

  async listApplications() {
    try {
      const client = await this.connect();
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiseape_apps' LIMIT 1;`
      );

      if (tableCheck.rowCount === 0) {
        return this.getFallbackApps();
      }

      const result = await client.query(`
        SELECT
          app_id AS "appID",
          app_title AS "appTitle",
          app_version AS "appVersion",
          app_developer AS "appDeveloper",
          app_icon AS "appIcon",
          app_libraries AS "appLibraries",
          app_config AS "appConfig",
          app_start_point AS "appStartPoint",
          app_parameter AS "appParameter"
        FROM wiseape_apps
        ORDER BY app_title ASC
      `);

      if (result.rowCount === 0) {
        return this.getFallbackApps();
      }

      return result.rows.map((row) => ({
        appID: row.appID,
        appTitle: row.appTitle,
        appVersion: row.appVersion,
        appDeveloper: row.appDeveloper,
        appIcon: row.appIcon || '◫',
        appLibraries: this.parseJsonField(row.appLibraries, []),
        appConfig: this.parseJsonField(row.appConfig, {}),
        appStartPoint: row.appStartPoint || '',
        appParameter: this.parseJsonField(row.appParameter, {}),
      }));
    } catch (error) {
      console.warn('[WAS] PostgreSQL unavailable; loading fallback application list.', error.message);
      return this.getFallbackApps();
    }
  }
}

module.exports = PostgresAppRepository;
