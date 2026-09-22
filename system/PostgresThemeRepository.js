const { Client } = require('pg');

const fallbackThemes = [
  { id: 'macos-light', name: 'macOS Light', bg1: '#a4bfd5', bg2: '#d9e9f7', accent: '#3b82f6', accentDark: '#1d4ed8' },
  { id: 'light-blue', name: 'Light Blue', bg1: '#bfe3ff', bg2: '#eaf6ff', accent: '#0ea5e9', accentDark: '#0284c7' },
  { id: 'midnight', name: 'Midnight', bg1: '#1e293b', bg2: '#0f172a', accent: '#8b5cf6', accentDark: '#6d28d9' },
  { id: 'sunset', name: 'Sunset', bg1: '#fb923c', bg2: '#db2777', accent: '#f97316', accentDark: '#c2410c' },
  { id: 'forest', name: 'Forest', bg1: '#4ade80', bg2: '#064e3b', accent: '#16a34a', accentDark: '#166534' },
];

class PostgresThemeRepository {
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

  getFallbackThemes() {
    return fallbackThemes.map((theme) => ({ ...theme }));
  }

  async connect() {
    if (!this.client) {
      this.client = new Client(this.config);
      await this.client.connect();
    }
    return this.client;
  }

  async listThemes() {
    try {
      const client = await this.connect();
      const tableCheck = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wiseape_themes' LIMIT 1;`
      );

      if (tableCheck.rowCount === 0) {
        return this.getFallbackThemes();
      }

      const result = await client.query(`
        SELECT
          theme_id AS id,
          theme_name AS name,
          bg1,
          bg2,
          accent,
          accent_dark AS "accentDark"
        FROM wiseape_themes
        ORDER BY theme_name ASC
      `);

      if (result.rowCount === 0) {
        return this.getFallbackThemes();
      }

      return result.rows;
    } catch (error) {
      console.warn('[WAS] PostgreSQL unavailable; loading fallback theme list.', error.message);
      return this.getFallbackThemes();
    }
  }
}

module.exports = PostgresThemeRepository;
