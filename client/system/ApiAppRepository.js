const fallbackApps = [
  {
    appID: 'helloWorld',
    appTitle: 'HelloWorld',
    appVersion: '1.0.0',
    appDeveloper: 'Wiseape',
    appIcon: '✦',
    appLibraries: ['Wiseape WAS'],
    appConfig: { theme: 'light', mode: 'starter' },
    appStartPoint: 'applications/HelloWorld/AppHelloWorld.js:AppHelloWorld',
    appParameter: { message: 'Hello World' },
  },
  {
    appID: 'settings',
    appTitle: 'Settings',
    appVersion: '1.0.0',
    appDeveloper: 'Wiseape',
    appIcon: '⚙',
    appLibraries: ['Wiseape WAS'],
    appConfig: {},
    appStartPoint: 'applications/Settings/AppSettings.js:AppSettings',
    appParameter: {},
  },
  {
    appID: 'controls',
    appTitle: 'Controls',
    appVersion: '1.0.0',
    appDeveloper: 'Wiseape',
    appIcon: '🎛',
    appLibraries: ['Wiseape WAS'],
    appConfig: {},
    appStartPoint: 'applications/Controls/AppControls.js:AppControls',
    appParameter: {},
  },
];

class ApiAppRepository {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:4000';
  }

  getFallbackApps() {
    return fallbackApps.map((app) => ({ ...app }));
  }

  async listApplications() {
    try {
      const response = await fetch(`${this.baseUrl}/api/apps`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const apps = await response.json();
      if (!Array.isArray(apps) || apps.length === 0) {
        return this.getFallbackApps();
      }

      return apps.map((app) => ({
        ...app,
        appIcon: app.appIcon || '◫',
      }));
    } catch (error) {
      console.warn('[WAS] Application API unavailable; loading fallback application list.', error.message);
      return this.getFallbackApps();
    }
  }
}

module.exports = ApiAppRepository;
