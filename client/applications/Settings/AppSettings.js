const WiseApplication = require('../../system/WiseApplication');
const WinSettings = require('./forms/WinSettings');

class AppSettings extends WiseApplication {
  async run(appConfig = {}, appParameter = {}) {
    const settingsWindow = this.createWindow(WinSettings, {
      width: 420,
      height: 260,
      positionX: 360,
      positionY: 140,
      themes: this.system.themes,
    });

    settingsWindow.show(appParameter);

    return {
      appID: this.appID,
      appTitle: this.appTitle,
      status: 'started',
      window: settingsWindow.toJSON(),
    };
  }
}

module.exports = AppSettings;
