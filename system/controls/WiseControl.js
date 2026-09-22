(function () {
  const isBrowser = typeof window !== 'undefined';

  class WiseControl {
    constructor(value = '', options = {}) {
      this.value = value;
      this.name = 'WiseControl';
      this.id = options.id || null;
      this.visible = options.visible !== undefined ? options.visible : true;
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        visible: this.visible,
      };
    }

    // ---- Browser-only: DOM rendering. Every subclass owns its own
    // renderElement/gatherValue/patchElement; these are the generic
    // fallbacks used when a subclass doesn't need to override them. ----

    static applyCommon(el, data) {
      if (data.id) {
        el.dataset.controlId = data.id;
        el.dataset.controlType = data.type;
      }
      Object.entries(data.style || {}).forEach(([key, value]) => {
        el.style[key] = typeof value === 'number' ? `${value}px` : value;
      });
      if (data.visible === false) {
        el.style.display = 'none';
      }
    }

    // Renders an unrecognized control type as a raw JSON dump, and is the
    // base implementation for simple single-element controls (text input,
    // select, textarea, ...) that don't need their own DOM structure logic.
    static renderElement(data) {
      const el = document.createElement('pre');
      el.textContent = JSON.stringify(data, null, 2);
      WiseControl.applyCommon(el, data);
      return el;
    }

    // Reads this control's current value back out of the DOM. Returns
    // `undefined` for non-value-bearing controls (labels, buttons) so
    // they're excluded from the values gathered when another control's
    // event fires.
    static gatherValue(winEl, id) {
      const node = winEl.querySelector(`[data-control-id="${id}"]`);
      if (!node) return undefined;
      if (node.isContentEditable) return node.innerHTML;
      if (node.tagName === 'INPUT' || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA') {
        return node.value;
      }
      return undefined;
    }

    // Applies a fresh value (from the server) back onto this control's DOM.
    static patchElement(winEl, data) {
      const el = winEl.querySelector(`[data-control-id="${data.id}"]`);
      if (!el) return;

      if (el.isContentEditable) {
        el.innerHTML = data.value ?? '';
      } else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.value = data.value ?? '';
      } else {
        el.textContent = data.value ?? '';
      }
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry = window.WiseControlRegistry || {};
    window.WiseControlRegistry.WiseControl = WiseControl;
  } else {
    module.exports = WiseControl;
  }
})();
