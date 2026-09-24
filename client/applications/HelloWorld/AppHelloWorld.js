const WiseApplication = require('../../system/WiseApplication');
const WinHello = require('./forms/WinHello');

class AppHelloWorld extends WiseApplication {
  run(appConfig = {}, appParameter = {}) {
    const helloWindow = this.createWindow(WinHello);

    helloWindow.show(appParameter);

    return {
      appID: this.appID,
      appTitle: this.appTitle,
      status: 'started',
      window: helloWindow.toJSON(),
    };
  }
}

module.exports = AppHelloWorld;
