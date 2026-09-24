const employeesModel = require('../models/employeesModel');

async function listEmployees(params) {
  return employeesModel.listEmployees(params);
}

async function updateEmployee(id, fields) {
  return employeesModel.updateEmployee(id, fields);
}

module.exports = { listEmployees, updateEmployee, DEPARTMENTS: employeesModel.DEPARTMENTS };
