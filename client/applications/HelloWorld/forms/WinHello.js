const WiseWindow = require('../../../system/WiseWindow');
const WiseLabel = require('../../../system/controls/WiseLabel');
const WiseTextBox = require('../../../system/controls/WiseTextBox');
const WiseButton = require('../../../system/controls/WiseButton');

class WinHello extends WiseWindow {
  constructor(options = {}) {
    super(options);
    this.title = 'Hello World';
    this.appTitle = options.appTitle || 'HelloWorld';
    this.appIcon = options.appIcon || '✦';
    this.width = '900';
    this.height = '700';
  }

  onWindowInit() {
    this.controls = [];
    this.addControl(new WiseLabel('Hello World', { id: 'lblHello', style: { fontSize: 32, color: '#111827', marginTop: '20px' } }));
    this.addControl(new WiseTextBox('Enter your name', { id: 'txtName' }));
    this.addControl(new WiseButton('Say Hello', { id: 'btnSay', onClick: this.sayHelloAgain.bind(this) }));
    return this;
  }

  sayHelloAgain() {
    this.lblHello.text('Hello, ' + this.txtName.value);
  }

  show(param = null) {
    this.visible = true;
    this.params = param;
    return super.show(param);
  }
}

module.exports = WinHello;
