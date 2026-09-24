const isServer = typeof window === 'undefined';

let path;
let ApiAppRepository;
let ApiThemeRepository;
let WiseApplication;
let ServerWiseDesktop;

if (isServer) {
  path = require('path');
  ApiAppRepository = require('./ApiAppRepository');
  ApiThemeRepository = require('./ApiThemeRepository');
  WiseApplication = require('./WiseApplication');
  ServerWiseDesktop = require('./WiseDesktop');
}

class WiseApplicationSystem {
  constructor(options = {}) {
    this.apps = [];
    this.desktop = null;
    this.runningApplications = new Map();
    this.themes = [];
    this.activeThemeId = null;
    this.backgroundImage = null;
    this.systemConfig = {
      name: 'Wiseape Application System',
      version: '1.0.0',
      theme: 'macos',
    };

    if (isServer) {
      this.repository = new ApiAppRepository(options.api || {});
      this.themeRepository = new ApiThemeRepository(options.api || {});
    } else {
      this.root = options.root || null;
    }
  }

  async run(user = null) {
    await this.loadApplications();
    await this.loadThemes();

    const DesktopClass = isServer ? ServerWiseDesktop : WiseDesktop;
    this.desktop = isServer ? new DesktopClass() : new DesktopClass(this.root);

    if (!isServer) {
      this.desktop.onIconClick = (app) => this.runApplication(app.appID);
    }

    this.desktop.applyTheme(this.getActiveTheme());
    this.desktop.applyBackgroundImage(this.backgroundImage);

    // The full catalog (this.apps) stays intact -- runApplication and the
    // /api/apps route both need every app, admin included, regardless of
    // who's asking (AppAdmin.run() itself enforces the role check). Only
    // the dock/launchpad rendering is filtered per-viewer.
    const visibleApps = (!user || user.role !== 'admin')
      ? this.apps.filter((app) => app.appID !== 'admin')
      : this.apps;

    const desktopResult = this.desktop.run(visibleApps);

    return {
      system: this.systemConfig,
      apps: this.apps,
      desktop: desktopResult,
    };
  }

  async loadThemes() {
    if (isServer) {
      this.themes = await this.themeRepository.listThemes();
      if (!this.activeThemeId) {
        this.activeThemeId = (this.themes[0] && this.themes[0].id) || null;
      }
    } else {
      const response = await fetch('/api/themes');
      if (!response.ok) {
        throw new Error('Failed to fetch theme list');
      }
      const data = await response.json();
      this.themes = data.themes || [];
      this.activeThemeId = data.activeThemeId || (this.themes[0] && this.themes[0].id) || null;
      this.backgroundImage = data.backgroundImage || null;
    }

    return this.themes;
  }

  getActiveTheme() {
    return this.themes.find((theme) => theme.id === this.activeThemeId) || this.themes[0] || null;
  }

  setActiveTheme(themeId) {
    const theme = this.themes.find((item) => item.id === themeId);
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`);
    }

    this.activeThemeId = themeId;
    if (this.desktop) {
      this.desktop.applyTheme(theme);
    }

    return theme;
  }

  setBackgroundImage(url) {
    this.backgroundImage = url || null;
    if (this.desktop) {
      this.desktop.applyBackgroundImage(this.backgroundImage);
    }

    return this.backgroundImage;
  }

  async loadApplications() {
    if (isServer) {
      const appRows = await this.repository.listApplications();
      this.apps = appRows.map((appRow) => new WiseApplication({
        appID: appRow.appID,
        appTitle: appRow.appTitle,
        appVersion: appRow.appVersion,
        appDeveloper: appRow.appDeveloper,
        appIcon: appRow.appIcon || '◫',
        appLibraries: appRow.appLibraries,
        appConfig: appRow.appConfig,
        appStartPoint: appRow.appStartPoint,
        appParameter: appRow.appParameter,
      }));
    } else {
      const response = await fetch('/api/apps');
      if (!response.ok) {
        throw new Error('Failed to fetch application list');
      }
      this.apps = await response.json();
    }

    return this.apps;
  }

  resolveApplicationClass(app) {
    if (!app || !app.appStartPoint) {
      return WiseApplication;
    }

    const [relativePath, className] = String(app.appStartPoint).split(':');
    if (!relativePath || !className) {
      return WiseApplication;
    }

    const absolutePath = path.resolve(process.cwd(), relativePath);
    const loadedModule = require(absolutePath);
    return loadedModule[className] || loadedModule || WiseApplication;
  }

  async runApplication(appId, session = null) {
    if (!isServer) {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('was_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/applications/run', {
        method: 'POST',
        headers,
        body: JSON.stringify({ appId }),
      });
      const result = await response.json();
      if (result.application && this.desktop) {
        this.desktop.renderWindow(result.application, result.startupResult);
      }
      return result;
    }

    const app = this.apps.find((item) => item.appID === appId || item.appID === Number(appId));

    if (!app) {
      throw new Error(`Application ${appId} not found`);
    }

    this.currentSession = session || null;

    const desktopEvent = this.desktop?.onApplicationIconClick(app) || { event: 'onApplicationIconClick', app };
    const AppClass = this.resolveApplicationClass(app);
    const instance = new AppClass(app.toJSON());
    instance.system = this;
    const startupResult = await instance.run(app.appConfig, app.appParameter);

    this.runningApplications.set(instance.appID || app.appID, instance);

    return {
      event: desktopEvent,
      application: instance.toJSON ? instance.toJSON() : app.toJSON(),
      startupResult,
    };
  }

  async dispatchControlEvent(appId, controlId, eventName, values = {}, session = null) {
    const instance = this.runningApplications.get(appId) || this.runningApplications.get(Number(appId));

    if (!instance || !instance.window) {
      throw new Error(`No running window for application ${appId}`);
    }

    this.currentSession = session || null;

    const win = instance.window;

    Object.entries(values).forEach(([id, value]) => {
      if (win[id]) {
        win[id].value = value;
      }
    });

    const control = win[controlId];
    if (!control) {
      throw new Error(`Control ${controlId} not found`);
    }

    const handlerName = `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
    const handler = control[handlerName];
    if (typeof handler === 'function') {
      await handler.call(win);
    }

    return {
      window: win.toJSON(),
      theme: this.getActiveTheme(),
      backgroundImage: this.backgroundImage,
    };
  }

  getSystemSnapshot() {
    return {
      system: this.systemConfig,
      apps: this.apps.map((app) => app.toJSON()),
      desktop: this.desktop ? this.desktop.run(this.apps) : null,
    };
  }
}

if (isServer) {
  module.exports = WiseApplicationSystem;
}
