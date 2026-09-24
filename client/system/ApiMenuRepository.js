const fallbackMenus = [
  {
    id: 1,
    type: 'group',
    label: 'Demos',
    icon: '📁',
    appId: null,
    sortOrder: 0,
    children: [
      { id: 2, type: 'item', label: 'HelloWorld', icon: '✦', appId: 'helloWorld', sortOrder: 0, children: [] },
      { id: 3, type: 'item', label: 'Controls', icon: '🎛', appId: 'controls', sortOrder: 1, children: [] },
    ],
  },
  { id: 4, type: 'item', label: 'Settings', icon: '⚙', appId: 'settings', sortOrder: 1, children: [] },
];

class ApiMenuRepository {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
  }

  getFallbackMenus() {
    return JSON.parse(JSON.stringify(fallbackMenus));
  }

  async listMenus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/menus`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const menus = await response.json();
      if (!Array.isArray(menus) || menus.length === 0) {
        return this.getFallbackMenus();
      }

      return menus;
    } catch (error) {
      console.warn('[WAS] Menu API unavailable; loading fallback menu list.', error.message);
      return this.getFallbackMenus();
    }
  }
}

module.exports = ApiMenuRepository;
