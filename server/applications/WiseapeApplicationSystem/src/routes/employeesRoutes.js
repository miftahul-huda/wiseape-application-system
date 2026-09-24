const express = require('express');
const employeesController = require('../controllers/employeesController');

const router = express.Router();
router.get('/', employeesController.list);
router.patch('/:id', employeesController.update);

module.exports = router;
