(function () {
  const isBrowser = typeof window !== 'undefined';
  const WiseControl = isBrowser ? window.WiseControlRegistry.WiseControl : require('./WiseControl');

  class WiseFileUpload extends WiseControl {
    constructor(label = 'Choose file', options = {}) {
      super(options.value || '', options);
      this.name = 'WiseFileUpload';
      this.label = label;
      this.accept = options.accept || 'image/*';
      this.onChange = typeof options.onChange === 'function' ? options.onChange : null;
      this.style = options.style || {};
    }

    render() {
      return {
        type: this.name,
        id: this.id,
        value: this.value,
        label: this.label,
        accept: this.accept,
        hasHandler: !!this.onChange,
        style: this.style,
        visible: this.visible,
      };
    }

    static renderElement(data, context) {
      const wrapper = document.createElement('div');
      wrapper.className = 'justify-self-start';
      WiseControl.applyCommon(wrapper, data);

      const inputId = `upload-${data.id || Math.random().toString(36).slice(2)}`;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = data.accept || 'image/*';
      input.id = inputId;
      input.className = 'hidden';

      const label = document.createElement('label');
      label.htmlFor = inputId;
      label.className = 'flex cursor-pointer items-center gap-3.5 rounded-lg border-2 border-dashed border-slate-300 bg-white/50 px-4 py-3.5 shadow-sm transition hover:border-[var(--accent)] hover:bg-white';

      const preview = document.createElement('div');
      preview.className = 'wise-upload-preview flex h-14 w-14 flex-none items-center justify-center rounded-md bg-gradient-to-br from-slate-100 to-slate-200 bg-cover bg-center text-slate-400';

      const icon = document.createElement('svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.className = 'h-5 w-5';
      icon.innerHTML = '<path d="M12 16V4M12 4l-4 4M12 4l4 4"></path><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path>';

      if (data.value) {
        preview.style.backgroundImage = `url("${data.value}")`;
        icon.style.display = 'none';
      }
      preview.appendChild(icon);

      const text = document.createElement('div');
      text.className = 'flex flex-col';
      text.innerHTML = `<strong class="text-sm text-slate-800">${data.label || 'Choose a file'}</strong><span class="text-[10px] text-slate-500">Click to browse or drop an image</span>`;

      label.appendChild(preview);
      label.appendChild(text);
      wrapper.appendChild(input);
      wrapper.appendChild(label);

      if (data.hasHandler) {
        input.addEventListener('change', async () => {
          const file = input.files && input.files[0];
          if (!file) return;

          preview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
          icon.style.display = 'none';

          const uploadResponse = await fetch('/api/uploads', {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'X-Filename': encodeURIComponent(file.name),
            },
            body: file,
          });
          const uploadResult = await uploadResponse.json();
          if (!uploadResult.url) return;

          context.desktop.sendControlEvent(context.appId, data.id, wrapper, 'change', { [data.id]: uploadResult.url });
        });
      }

      return wrapper;
    }

    // The real value is only known after the async upload completes, so
    // there is nothing meaningful to read synchronously from the DOM; it
    // reaches the server via overrideValues in the change handler above.
    static gatherValue() {
      return undefined;
    }

    static patchElement(winEl, data) {
      const wrapper = winEl.querySelector(`[data-control-id="${data.id}"]`);
      if (!wrapper) return;
      const preview = wrapper.querySelector('.wise-upload-preview');
      if (preview && data.value) {
        preview.style.backgroundImage = `url("${data.value}")`;
        const icon = preview.querySelector('svg');
        if (icon) icon.style.display = 'none';
      }
    }
  }

  if (isBrowser) {
    window.WiseControlRegistry.WiseFileUpload = WiseFileUpload;
  } else {
    module.exports = WiseFileUpload;
  }
})();
