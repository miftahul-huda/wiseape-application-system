(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseTextBox extends WiseControl {
    constructor(placeholder = '', options = {}) {
      super(options.value || '', options);
      this.name = 'WiseTextBox';
      this.placeholder = placeholder;
      this.style = options.style || {};
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        placeholder: this.placeholder,
        style: this.style,
        visible: this.visible,
      };
    }

    static renderElement(data) {
      const el = document.createElement('input');
      el.type = 'text';
      el.placeholder = data.placeholder || '';
      el.value = data.value || '';
      el.className = 'w-full appearance-none rounded-lg border-0 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm ring-1 ring-slate-900/10 outline-none transition focus:shadow-md focus:ring-2 focus:ring-[var(--accent)]';
      WiseControl.applyCommon(el, data);
      return el;
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseTextBox = WiseTextBox;
  } else {
    module.exports = WiseTextBox;
  }
})();
