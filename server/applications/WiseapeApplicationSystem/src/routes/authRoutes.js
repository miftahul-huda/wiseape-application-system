const express = require('express');
const authController = require('../controllers/authController');
const { requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/session', requireUser, authController.session);
router.post('/logout', authController.logout);
router.put('/preferences', requireUser, authController.updatePreferences);
router.get('/settings', authController.getSettings);
router.put('/settings', requireUser, requireAdmin, authController.putSettings);
router.get('/pending-users', requireUser, requireAdmin, authController.pendingUsers);
router.post('/approve/:id', requireUser, requireAdmin, authController.approveUser);

module.exports = router;
