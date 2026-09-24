(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseLabel extends WiseControl {
    constructor(value = '', options = {}) {
      super(value, options);
      this.name = 'WiseLabel';
      this.style = options.style || {};
    }

    text(value) {
      if (value !== undefined) {
        this.value = value;
      }
      return this.value;
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        style: this.style,
        visible: this.visible,
      };
    }

    static renderElement(data) {
      const el = document.createElement('div');
      el.className = 'whitespace-pre-wrap text-sm text-slate-800';
      el.textContent = data.value;
      WiseControl.applyCommon(el, data);
      return el;
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseLabel = WiseLabel;
  } else {
    module.exports = WiseLabel;
  }
})();
