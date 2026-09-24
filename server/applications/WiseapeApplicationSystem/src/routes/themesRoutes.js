const express = require('express');
const themesController = require('../controllers/themesController');

const router = express.Router();
router.get('/', themesController.list);

module.exports = router;
