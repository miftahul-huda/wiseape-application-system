class WiseApplication {
  constructor(appMetadata = {}) {
    this.appID = appMetadata.appID || appMetadata.appId || 'unknown-app';
    this.appTitle = appMetadata.appTitle || 'Untitled Application';
    this.appVersion = appMetadata.appVersion || '1.0.0';
    this.appDeveloper = appMetadata.appDeveloper || 'Wiseape';
    this.appIcon = appMetadata.appIcon || appMetadata.appIconUrl || appMetadata.icon || '◫';
    this.appLibraries = Array.isArray(appMetadata.appLibraries) ? appMetadata.appLibraries : [];
    this.appConfig = appMetadata.appConfig || {};
    this.appStartPoint = appMetadata.appStartPoint || '';
    this.appParameter = appMetadata.appParameter || {};
    this.window = null;
    this.controls = [];
    this.system = null;
  }

  run(appConfig = {}, appParameter = {}) {
    this.appConfig = { ...this.appConfig, ...appConfig };
    this.appParameter = { ...this.appParameter, ...appParameter };

    return {
      appID: this.appID,
      appTitle: this.appTitle,
      appVersion: this.appVersion,
      appDeveloper: this.appDeveloper,
      appIcon: this.appIcon,
      appConfig: this.appConfig,
      appParameter: this.appParameter,
      status: 'started',
    };
  }

  createWindow(WindowClass, options = {}) {
    const windowOptions = {
      appId: this.appID,
      appTitle: this.appTitle,
      appIcon: this.appIcon,
      system: this.system,
      ...options,
    };

    this.window = new WindowClass(windowOptions);
    if (typeof this.window.onWindowInit === 'function') {
      this.window.onWindowInit();
    }
    return this.window;
  }

  toJSON() {
    return {
      appID: this.appID,
      appTitle: this.appTitle,
      appVersion: this.appVersion,
      appDeveloper: this.appDeveloper,
      appIcon: this.appIcon,
      appLibraries: this.appLibraries,
      appConfig: this.appConfig,
      appStartPoint: this.appStartPoint,
      appParameter: this.appParameter,
      controls: this.controls.map((control) => control.render ? control.render() : control),
    };
  }
}

module.exports = WiseApplication;
