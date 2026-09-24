const authModel = require('../models/authModel');
const password = require('../utils/password');

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function register({ name, email, password: plainPassword, confirmPassword }) {
  if (!name || !email || !plainPassword || !confirmPassword) {
    throw httpError('Name, email, password, and confirm password are all required', 400);
  }
  if (plainPassword !== confirmPassword) {
    throw httpError('Passwords do not match', 400);
  }
  if (plainPassword.length < 6) {
    throw httpError('Password must be at least 6 characters', 400);
  }

  const user = await authModel.createUser({ name, email, password: plainPassword });

  if (user.status === 'active') {
    const session = await authModel.createSession(user.id);
    return { user, token: session.token, expiresAt: session.expiresAt };
  }

  return { user, message: 'Registration submitted. Your account is waiting for admin approval.' };
}

async function login({ email, password: plainPassword }) {
  if (!email || !plainPassword) {
    throw httpError('Email and password are required', 400);
  }

  const row = await authModel.findUserByEmail(email);
  if (!row || !password.verify(plainPassword, row.passwordSalt, row.passwordHash)) {
    throw httpError('Invalid email or password', 401);
  }
  if (row.status !== 'active') {
    throw httpError('Your account is waiting for admin approval', 403);
  }

  const user = {
    id: row.id, name: row.name, email: row.email, role: row.role,
    status: row.status, themeId: row.themeId, backgroundImage: row.backgroundImage,
  };
  const session = await authModel.createSession(user.id);
  return { user, token: session.token, expiresAt: session.expiresAt };
}

async function getSessionUser(token) {
  return authModel.findValidSession(token);
}

async function logout(token) {
  if (token) await authModel.deleteSession(token);
}

async function findUserById(id) {
  return authModel.findUserById(id);
}

async function updateUserPreferences(userId, prefs) {
  return authModel.updateUserPreferences(userId, prefs);
}

async function getRegistrationRequiresApproval() {
  return authModel.getRegistrationRequiresApproval();
}

async function setRegistrationRequiresApproval(value) {
  return authModel.setRegistrationRequiresApproval(value);
}

async function listPendingUsers() {
  return authModel.listPendingUsers();
}

async function approveUser(id) {
  return authModel.approveUser(id);
}

module.exports = {
  register,
  login,
  getSessionUser,
  logout,
  findUserById,
  updateUserPreferences,
  getRegistrationRequiresApproval,
  setRegistrationRequiresApproval,
  listPendingUsers,
  approveUser,
};
