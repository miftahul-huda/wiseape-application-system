(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseButton extends WiseControl {
    constructor(label = '', options = {}) {
      super(label, options);
      this.name = 'WiseButton';
      this.onClick = typeof options.onClick === 'function' ? options.onClick : null;
      this.style = options.style || {};
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        // The onClick function itself can't cross the JSON boundary to the
        // browser. Only whether a handler exists is sent; the browser asks
        // the server to actually invoke it (see WiseApplicationSystem.dispatchControlEvent).
        hasHandler: !!this.onClick,
        style: this.style,
        visible: this.visible,
      };
    }

    static renderElement(data, context) {
      const el = document.createElement('button');
      el.type = 'button';
      el.textContent = data.value;
      el.className = 'appearance-none border-0 justify-self-start inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[var(--accent)]/30 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--accent)]/40 hover:brightness-105 active:translate-y-0 active:shadow-sm active:brightness-95 cursor-pointer';
      WiseControl.applyCommon(el, data);
      if (data.hasHandler) {
        el.addEventListener('click', () => context.desktop.sendControlEvent(context.appId, data.id, el, 'click'));
      }
      return el;
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseButton = WiseButton;
  } else {
    module.exports = WiseButton;
  }
})();
