(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseComboBox extends WiseControl {
    constructor(items = [], options = {}) {
      super(options.value ?? (items[0] && items[0].value) ?? '', options);
      this.name = 'WiseComboBox';
      this.items = items;
      this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
      this.style = options.style || {};
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        items: this.items,
        hasHandler: !!this.onChange,
        style: this.style,
        visible: this.visible,
      };
    }

    static renderElement(data, context) {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative justify-self-start min-w-[200px]';

      const el = document.createElement('select');
      el.className = 'w-full cursor-pointer appearance-none rounded-lg border-0 bg-white py-2.5 pl-4 pr-9 text-sm text-slate-800 shadow-sm ring-1 ring-slate-900/10 outline-none transition focus:shadow-md focus:ring-2 focus:ring-[var(--accent)]';
      (data.items || []).forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        if (item.value === data.value) {
          option.selected = true;
        }
        el.appendChild(option);
      });
      WiseControl.applyCommon(el, data);
      if (data.hasHandler) {
        el.addEventListener('change', () => context.desktop.sendControlEvent(context.appId, data.id, el, 'change'));
      }

      const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chevron.setAttribute('viewBox', '0 0 24 24');
      chevron.setAttribute('fill', 'none');
      chevron.setAttribute('stroke', 'currentColor');
      chevron.setAttribute('stroke-width', '2');
      chevron.setAttribute('stroke-linecap', 'round');
      chevron.setAttribute('stroke-linejoin', 'round');
      chevron.setAttribute('class', 'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400');
      chevron.innerHTML = '<path d="m6 9 6 6 6-6"></path>';

      wrapper.appendChild(el);
      wrapper.appendChild(chevron);
      return wrapper;
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseComboBox = WiseComboBox;
  } else {
    module.exports = WiseComboBox;
  }
})();
