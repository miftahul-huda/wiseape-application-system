const express = require('express');
const appsController = require('../controllers/appsController');

const router = express.Router();
router.get('/', appsController.list);

module.exports = router;
