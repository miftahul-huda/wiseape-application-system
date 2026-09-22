(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseDate extends WiseControl {
    constructor(value = '', options = {}) {
      super(value, options);
      this.name = 'WiseDate';
      this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
      this.style = options.style || {};
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        hasHandler: !!this.onChange,
        style: this.style,
        visible: this.visible,
      };
    }

    static renderElement(data, context) {
      const el = document.createElement('input');
      el.type = 'date';
      el.value = data.value || '';
      el.className = 'w-full appearance-none rounded-lg border-0 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-900/10 outline-none transition focus:shadow-md focus:ring-2 focus:ring-[var(--accent)]';
      WiseControl.applyCommon(el, data);
      if (data.hasHandler) {
        el.addEventListener('change', () => context.desktop.sendControlEvent(context.appId, data.id, el, 'change'));
      }
      return el;
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseDate = WiseDate;
  } else {
    module.exports = WiseDate;
  }
})();
