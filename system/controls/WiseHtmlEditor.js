(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseHtmlEditor extends WiseControl {
    constructor(value = '', options = {}) {
      super(value, options);
      this.name = 'WiseHtmlEditor';
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
      wrapper.className = 'overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-900/10 transition focus-within:ring-2 focus-within:ring-[var(--accent)]';

      const toolbar = document.createElement('div');
      toolbar.className = 'flex gap-1 border-b border-slate-900/5 bg-slate-50 p-2';

      const makeToolButton = (label, command) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.className = 'appearance-none border-0 flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm cursor-pointer';
        btn.addEventListener('mousedown', (event) => {
          event.preventDefault();
          document.execCommand(command, false, null);
        });
        return btn;
      };

      toolbar.appendChild(makeToolButton('B', 'bold'));
      toolbar.appendChild(makeToolButton('I', 'italic'));
      toolbar.appendChild(makeToolButton('U', 'underline'));
      toolbar.appendChild(makeToolButton('•', 'insertUnorderedList'));

      // The editable region (not the wrapper) carries data-control-id, so
      // the base class's generic gatherValue/patchElement (which already
      // know how to read/write a contenteditable element) work here without
      // overrides.
      const editable = document.createElement('div');
      editable.className = 'min-h-[90px] px-4 py-3 text-sm text-slate-800 outline-none';
      editable.contentEditable = 'true';
      editable.innerHTML = data.value || '';
      WiseControl.applyCommon(editable, data);

      if (data.hasHandler) {
        editable.addEventListener('blur', () => context.desktop.sendControlEvent(context.appId, data.id, wrapper, 'change'));
      }

      wrapper.appendChild(toolbar);
      wrapper.appendChild(editable);
      return wrapper;
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseHtmlEditor = WiseHtmlEditor;
  } else {
    module.exports = WiseHtmlEditor;
  }
})();
