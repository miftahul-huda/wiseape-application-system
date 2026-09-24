const employeesService = require('../services/employeesService');

async function list(req, res, next) {
  try {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;
    const sortField = req.query.sortField || 'id';
    const sortDirection = req.query.sortDirection || 'asc';
    res.json(await employeesService.listEmployees({ limit, offset, sortField, sortDirection }));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const saved = await employeesService.updateEmployee(req.params.id, req.body || {});
    if (!saved) {
      return res.status(404).json({ error: 'Employee not found or nothing to update' });
    }
    res.json({ employee: saved });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, update };
