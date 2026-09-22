class WiseWindow {
  constructor(options = {}) {
    this.windowId = options.windowId || `window-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.title = options.title || 'Untitled Window';
    this.appId = options.appId || null;
    this.appTitle = options.appTitle || 'Application';
    this.appIcon = options.appIcon || '◫';
    this.width = options.width || 640;
    this.height = options.height || 420;
    this.positionX = options.positionX || 220;
    this.positionY = options.positionY || 120;
    this.visible = false;
    this.minimized = false;
    this.maximized = false;
    this.params = null;
    this.controls = [];
    this.onShow = null;
    this.onShowDialog = null;
    this.system = options.system || null;
  }

  addControl(control) {
    this.controls.push(control);
    if (control.id) {
      this[control.id] = control;
    }
    return this;
  }

  onWindowInit() {
    return this;
  }

  show(param = null) {
    this.visible = true;
    this.minimized = false;
    this.params = param;
    if (typeof this.onShow === 'function') {
      this.onShow(param);
    }

    return {
      status: 'shown',
      window: this.toJSON(),
      param,
    };
  }

  showDialog(param = null) {
    this.visible = true;
    this.minimized = false;
    this.params = param;
    if (typeof this.onShowDialog === 'function') {
      this.onShowDialog(param);
    }

    return {
      status: 'dialog',
      window: this.toJSON(),
      param,
    };
  }

  close() {
    this.visible = false;
    this.minimized = false;
    this.maximized = false;
    return { status: 'closed', window: this.toJSON() };
  }

  maximize() {
    this.maximized = !this.maximized;
    return { status: this.maximized ? 'maximized' : 'restored', maximized: this.maximized, window: this.toJSON() };
  }

  minimize() {
    this.minimized = !this.minimized;
    return { status: this.minimized ? 'minimized' : 'restored', minimized: this.minimized, window: this.toJSON() };
  }

  toJSON() {
    return {
      windowId: this.windowId,
      title: this.title,
      appId: this.appId,
      appTitle: this.appTitle,
      appIcon: this.appIcon,
      width: this.width,
      height: this.height,
      positionX: this.positionX,
      positionY: this.positionY,
      visible: this.visible,
      minimized: this.minimized,
      maximized: this.maximized,
      params: this.params,
      controls: this.controls.map((control) => control.render ? control.render() : control),
    };
  }
}

module.exports = WiseWindow;
