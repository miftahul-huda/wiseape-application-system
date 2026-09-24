const authService = require('../services/authService');
const { getBearerToken } = require('../middleware/auth');

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body || {});
    res.json(result);
  } catch (error) {
    if (error.code === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: error.message });
    }
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body || {});
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

async function session(req, res) {
  res.json({ user: req.user });
}

async function logout(req, res, next) {
  try {
    await authService.logout(getBearerToken(req));
    res.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
}

async function getSettings(req, res, next) {
  try {
    res.json({ requiresApproval: await authService.getRegistrationRequiresApproval() });
  } catch (error) {
    next(error);
  }
}

async function putSettings(req, res, next) {
  try {
    const requiresApproval = await authService.setRegistrationRequiresApproval(!!(req.body || {}).requiresApproval);
    res.json({ requiresApproval });
  } catch (error) {
    next(error);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const { themeId, backgroundImage } = req.body || {};
    const user = await authService.updateUserPreferences(req.user.id, { themeId, backgroundImage });
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

async function pendingUsers(req, res, next) {
  try {
    res.json({ pending: await authService.listPendingUsers() });
  } catch (error) {
    next(error);
  }
}

async function approveUser(req, res, next) {
  try {
    const approved = await authService.approveUser(req.params.id);
    if (!approved) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: approved });
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, session, logout, updatePreferences, getSettings, putSettings, pendingUsers, approveUser };
