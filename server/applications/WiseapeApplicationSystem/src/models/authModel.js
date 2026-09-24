const db = require('../../config/db');
const password = require('../utils/password');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'miftahul.huda@devoteam.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_NAME = 'Miftahul Huda';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REQUIRES_APPROVAL_KEY = 'registration_requires_approval';

let schemaReady = false;

function toUserJson(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    themeId: row.themeId,
    backgroundImage: row.backgroundImage,
  };
}

async function ensureSchema() {
  if (schemaReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS wiseape_users (
      user_id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      theme_id TEXT,
      background_image TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS wiseape_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES wiseape_users(user_id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS wiseape_app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT
    );
  `);

  const adminCheck = await db.query('SELECT 1 FROM wiseape_users WHERE email = $1', [ADMIN_EMAIL]);
  if (adminCheck.rowCount === 0) {
    const salt = password.generateSalt();
    await db.query(
      `INSERT INTO wiseape_users (name, email, password_hash, password_salt, role, status)
       VALUES ($1, $2, $3, $4, 'admin', 'active')`,
      [ADMIN_NAME, ADMIN_EMAIL, password.hash(ADMIN_PASSWORD, salt), salt]
    );
  }

  const settingCheck = await db.query('SELECT 1 FROM wiseape_app_settings WHERE setting_key = $1', [REQUIRES_APPROVAL_KEY]);
  if (settingCheck.rowCount === 0) {
    await db.query('INSERT INTO wiseape_app_settings (setting_key, setting_value) VALUES ($1, $2)', [REQUIRES_APPROVAL_KEY, 'false']);
  }

  schemaReady = true;
}

async function getRegistrationRequiresApproval() {
  await ensureSchema();
  const result = await db.query('SELECT setting_value FROM wiseape_app_settings WHERE setting_key = $1', [REQUIRES_APPROVAL_KEY]);
  return (result.rows[0] && result.rows[0].setting_value) === 'true';
}

async function setRegistrationRequiresApproval(requiresApproval) {
  await ensureSchema();
  await db.query(
    `INSERT INTO wiseape_app_settings (setting_key, setting_value) VALUES ($1, $2)
     ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value`,
    [REQUIRES_APPROVAL_KEY, requiresApproval ? 'true' : 'false']
  );
  return requiresApproval;
}

async function findUserByEmail(email) {
  await ensureSchema();
  const result = await db.query(
    `SELECT user_id AS id, name, email, password_hash AS "passwordHash", password_salt AS "passwordSalt",
            role, status, theme_id AS "themeId", background_image AS "backgroundImage"
     FROM wiseape_users WHERE email = $1`,
    [String(email).toLowerCase()]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  await ensureSchema();
  const result = await db.query(
    `SELECT user_id AS id, name, email, role, status, theme_id AS "themeId", background_image AS "backgroundImage"
     FROM wiseape_users WHERE user_id = $1`,
    [id]
  );
  return toUserJson(result.rows[0]);
}

async function createUser({ name, email, password: plainPassword }) {
  await ensureSchema();

  const normalizedEmail = String(email).toLowerCase();
  const existing = await db.query('SELECT 1 FROM wiseape_users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    const error = new Error('An account with this email already exists');
    error.code = 'EMAIL_TAKEN';
    throw error;
  }

  const requiresApproval = await getRegistrationRequiresApproval();
  const salt = password.generateSalt();
  const status = requiresApproval ? 'pending' : 'active';

  const result = await db.query(
    `INSERT INTO wiseape_users (name, email, password_hash, password_salt, role, status)
     VALUES ($1, $2, $3, $4, 'user', $5)
     RETURNING user_id AS id, name, email, role, status, theme_id AS "themeId", background_image AS "backgroundImage"`,
    [name, normalizedEmail, password.hash(plainPassword, salt), salt, status]
  );

  return toUserJson(result.rows[0]);
}

async function createSession(userId) {
  await ensureSchema();
  const token = password.generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.query('INSERT INTO wiseape_sessions (token, user_id, expires_at) VALUES ($1, $2, $3)', [token, userId, expiresAt]);
  return { token, expiresAt: expiresAt.toISOString() };
}

async function findValidSession(token) {
  if (!token) return null;
  await ensureSchema();
  const result = await db.query(
    `SELECT u.user_id AS id, u.name, u.email, u.role, u.status,
            u.theme_id AS "themeId", u.background_image AS "backgroundImage"
     FROM wiseape_sessions s
     JOIN wiseape_users u ON u.user_id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  return toUserJson(result.rows[0]);
}

async function deleteSession(token) {
  await ensureSchema();
  await db.query('DELETE FROM wiseape_sessions WHERE token = $1', [token]);
}

async function updateUserPreferences(userId, { themeId, backgroundImage } = {}) {
  const sets = [];
  const values = [];
  let index = 1;

  if (themeId !== undefined) {
    sets.push(`theme_id = $${index}`);
    values.push(themeId);
    index += 1;
  }
  if (backgroundImage !== undefined) {
    sets.push(`background_image = $${index}`);
    values.push(backgroundImage);
    index += 1;
  }
  if (sets.length === 0) return null;

  await ensureSchema();
  values.push(userId);
  const result = await db.query(
    `UPDATE wiseape_users SET ${sets.join(', ')} WHERE user_id = $${index}
     RETURNING user_id AS id, name, email, role, status, theme_id AS "themeId", background_image AS "backgroundImage"`,
    values
  );
  return toUserJson(result.rows[0]);
}

async function listPendingUsers() {
  await ensureSchema();
  const result = await db.query(
    `SELECT user_id AS id, name, email, created_at AS "createdAt"
     FROM wiseape_users WHERE status = 'pending' ORDER BY created_at ASC`
  );
  return result.rows;
}

async function approveUser(id) {
  await ensureSchema();
  const result = await db.query(
    `UPDATE wiseape_users SET status = 'active' WHERE user_id = $1
     RETURNING user_id AS id, name, email, role, status`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  getRegistrationRequiresApproval,
  setRegistrationRequiresApproval,
  findUserByEmail,
  findUserById,
  createUser,
  createSession,
  findValidSession,
  deleteSession,
  updateUserPreferences,
  listPendingUsers,
  approveUser,
};
