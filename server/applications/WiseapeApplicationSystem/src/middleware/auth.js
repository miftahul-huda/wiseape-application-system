const authService = require('../services/authService');

function getBearerToken(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  return match ? match[1] : null;
}

async function optionalUser(req, res, next) {
  try {
    const token = getBearerToken(req);
    req.token = token;
    req.user = token ? await authService.getSessionUser(token) : null;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireUser(req, res, next) {
  try {
    const token = getBearerToken(req);
    const user = token ? await authService.getSessionUser(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

module.exports = { getBearerToken, optionalUser, requireUser, requireAdmin };
