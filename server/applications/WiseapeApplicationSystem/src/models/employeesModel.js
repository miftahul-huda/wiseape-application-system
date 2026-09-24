const db = require('../../config/db');

const DEPARTMENTS = ['Engineering', 'Sales', 'Support', 'Marketing'];
const FIRST_NAMES = ['Ada', 'Grace', 'Alan', 'Linus', 'Margaret', 'Dennis', 'Barbara', 'Ken', 'Radia', 'Guido'];
const WRITABLE_COLUMNS = { name: 'name', department: 'department', active: 'active', level: 'level' };
const SORTABLE_COLUMNS = { id: 'employee_id', name: 'name', department: 'department', active: 'active', level: 'level' };

let schemaReady = false;

function buildFallbackEmployees(count) {
  const employees = [];
  for (let i = 0; i < count; i += 1) {
    employees.push({
      id: i + 1,
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${String.fromCharCode(65 + (i % 26))}.`,
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      active: i % 3 !== 0,
      level: i % 2 === 0 ? 'junior' : 'senior',
    });
  }
  return employees;
}

async function ensureSchema() {
  if (schemaReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS wiseape_employees (
      employee_id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      level TEXT NOT NULL DEFAULT 'junior'
    );
  `);

  const countResult = await db.query('SELECT COUNT(*)::int AS count FROM wiseape_employees');
  if (countResult.rows[0].count === 0) {
    const seed = buildFallbackEmployees(23);
    const values = [];
    const placeholders = seed.map((employee, index) => {
      const offset = index * 4;
      values.push(employee.name, employee.department, employee.active, employee.level);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
    });
    await db.query(
      `INSERT INTO wiseape_employees (name, department, active, level) VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  schemaReady = true;
}

async function listEmployees({ limit = 10, offset = 0, sortField = 'id', sortDirection = 'asc' } = {}) {
  try {
    await ensureSchema();
    const sortColumn = SORTABLE_COLUMNS[sortField] || 'employee_id';
    const direction = sortDirection === 'desc' ? 'DESC' : 'ASC';

    const countResult = await db.query('SELECT COUNT(*)::int AS count FROM wiseape_employees');
    const totalCount = countResult.rows[0].count;

    const result = await db.query(
      `SELECT employee_id AS id, name, department, active, level
       FROM wiseape_employees
       ORDER BY ${sortColumn} ${direction}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return { rows: result.rows, totalCount };
  } catch (error) {
    console.warn('[WAS API] wiseape_employees unavailable, using fallback list:', error.message);
    const all = buildFallbackEmployees(23);
    return { rows: all.slice(offset, offset + limit), totalCount: all.length };
  }
}

async function updateEmployee(id, fields = {}) {
  const sets = [];
  const values = [];
  let index = 1;

  Object.entries(fields).forEach(([key, value]) => {
    const column = WRITABLE_COLUMNS[key];
    if (!column) return;
    sets.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  });

  if (sets.length === 0) return null;

  try {
    await ensureSchema();
    values.push(id);
    const result = await db.query(
      `UPDATE wiseape_employees SET ${sets.join(', ')} WHERE employee_id = $${index}
       RETURNING employee_id AS id, name, department, active, level`,
      values
    );
    return result.rows[0] || null;
  } catch (error) {
    console.warn('[WAS API] could not persist employee update:', error.message);
    return null;
  }
}

module.exports = { DEPARTMENTS, listEmployees, updateEmployee };
