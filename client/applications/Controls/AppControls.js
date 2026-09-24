const WiseApplication = require('../../system/WiseApplication');
const WinControls = require('./forms/WinControls');

class AppControls extends WiseApplication {
  run(appConfig = {}, appParameter = {}) {
    const controlsWindow = this.createWindow(WinControls, {
      width: 480,
      height: 680,
      positionX: 260,
      positionY: 60,
    });

    controlsWindow.show(appParameter);

    return {
      appID: this.appID,
      appTitle: this.appTitle,
      status: 'started',
      window: controlsWindow.toJSON(),
    };
  }
}

module.exports = AppControls;
