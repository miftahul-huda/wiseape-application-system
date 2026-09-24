const express = require('express');
const menusController = require('../controllers/menusController');

const router = express.Router();
router.get('/', menusController.list);

module.exports = router;
