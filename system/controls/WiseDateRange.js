(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseDateRange extends WiseControl {
    constructor(value = {}, options = {}) {
      super({ start: value.start || '', end: value.end || '' }, options);
      this.name = 'WiseDateRange';
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
      const wrapper = document.createElement('div');
      wrapper.className = 'justify-self-start flex items-center gap-2.5';
      WiseControl.applyCommon(wrapper, data);

      const dateInputClass = 'appearance-none rounded-lg border-0 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm ring-1 ring-slate-900/10 outline-none transition focus:shadow-md focus:ring-2 focus:ring-[var(--accent)]';

      const startInput = document.createElement('input');
      startInput.type = 'date';
      startInput.dataset.range = 'start';
      startInput.value = (data.value && data.value.start) || '';
      startInput.className = dateInputClass;

      const sep = document.createElement('span');
      sep.className = 'rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500';
      sep.textContent = 'to';

      const endInput = document.createElement('input');
      endInput.type = 'date';
      endInput.dataset.range = 'end';
      endInput.value = (data.value && data.value.end) || '';
      endInput.className = dateInputClass;

      wrapper.appendChild(startInput);
      wrapper.appendChild(sep);
      wrapper.appendChild(endInput);

      if (data.hasHandler) {
        const handleChange = () => context.desktop.sendControlEvent(context.appId, data.id, wrapper, 'change');
        startInput.addEventListener('change', handleChange);
        endInput.addEventListener('change', handleChange);
      }

      return wrapper;
    }

    static gatherValue(winEl, id) {
      const wrapper = winEl.querySelector(`[data-control-id="${id}"]`);
      if (!wrapper) return { start: '', end: '' };
      const startEl = wrapper.querySelector('[data-range="start"]');
      const endEl = wrapper.querySelector('[data-range="end"]');
      return { start: startEl ? startEl.value : '', end: endEl ? endEl.value : '' };
    }

    static patchElement(winEl, data) {
      const wrapper = winEl.querySelector(`[data-control-id="${data.id}"]`);
      if (!wrapper) return;
      const startEl = wrapper.querySelector('[data-range="start"]');
      const endEl = wrapper.querySelector('[data-range="end"]');
      if (startEl) startEl.value = (data.value && data.value.start) || '';
      if (endEl) endEl.value = (data.value && data.value.end) || '';
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseDateRange = WiseDateRange;
  } else {
    module.exports = WiseDateRange;
  }
})();
