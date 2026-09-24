const menusModel = require('../models/menusModel');
const appsService = require('./appsService');

function resolveIcon(row, apps) {
  if (row.icon) return row.icon;
  if (row.type === 'item' && row.appId) {
    const app = apps.find((candidate) => String(candidate.appID) === String(row.appId));
    if (app) return app.appIcon;
  }
  return row.type === 'group' ? '📁' : '◫';
}

function buildTree(rows, apps) {
  const byId = new Map();
  rows.forEach((row) => {
    byId.set(row.id, {
      id: row.id,
      type: row.type,
      label: row.label,
      icon: resolveIcon(row, apps),
      appId: row.appId,
      sortOrder: row.sortOrder,
      children: [],
    });
  });

  const roots = [];
  rows.forEach((row) => {
    const node = byId.get(row.id);
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes) => {
    nodes.sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.label).localeCompare(String(b.label)));
    nodes.forEach((node) => sortTree(node.children));
  };
  sortTree(roots);

  return roots;
}

async function getMenuTree() {
  const [rows, apps] = await Promise.all([menusModel.listMenus(), appsService.listApps()]);
  return buildTree(rows, apps);
}

module.exports = { getMenuTree };
