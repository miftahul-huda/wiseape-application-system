const express = require('express');
const uploadsController = require('../controllers/uploadsController');

const router = express.Router();
router.post('/', express.raw({ limit: '10mb', type: () => true }), uploadsController.upload);

module.exports = router;
