const express = require('express');

const router = express.Router();

router.use('/api/apps', require('./appsRoutes'));
router.use('/api/menus', require('./menusRoutes'));
router.use('/api/themes', require('./themesRoutes'));
router.use('/api/employees', require('./employeesRoutes'));
router.use('/api/auth', require('./authRoutes'));
router.use('/api/uploads', require('./uploadsRoutes'));

module.exports = router;
