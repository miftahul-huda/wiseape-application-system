class WiseDesktop {
  constructor(root = null) {
    this.root = root;
    this.menus = [];
    this.topBar = {
      left: ['Wiseape'],
      right: ['Battery 100%', 'Wi‑Fi', 'Tue 9:41'],
    };
    this.theme = 'macos';
    this.windowStack = [];
    this.onIconClick = null;
  }

  // Builds the desktop snapshot and, in the browser (when a DOM `root` is
  // attached), renders it. Server-side callers only ever use the snapshot.
  // `menus` is the (already role-filtered) menu tree: a mix of `group`
  // nodes (folders, with `children`) and `item` nodes (link to an app via
  // `appId`).
  run(menus = []) {
    this.menus = menus;
    this.windowStack = [];

    const snapshot = this.buildSnapshot(menus);

    if (this.root) {
      this.renderDesktop();
    }

    return snapshot;
  }

  buildSnapshot(menus = []) {
    const leafItems = this.flattenMenuItems(menus);
    return {
      theme: this.theme,
      menus,
      topBar: this.topBar,
      dock: leafItems.map((item) => ({
        id: item.appId,
        title: item.label,
        icon: this.getAppIcon(item),
      })),
    };
  }

  // Recursively collects every `item` (leaf) node across a menu tree,
  // depth-first, skipping `group` nodes themselves -- used for the dock
  // (which never shows folders) and the top-level Launchpad view.
  flattenMenuItems(nodes = []) {
    const result = [];
    nodes.forEach((node) => {
      if (node.type === 'group') {
        result.push(...this.flattenMenuItems(node.children || []));
      } else {
        result.push(node);
      }
    });
    return result;
  }

  onApplicationIconClick(app) {
    return {
      event: 'onApplicationIconClick',
      app,
      timestamp: new Date().toISOString(),
    };
  }

  // Accepts either a menu node ({icon, label}) or a running application
  // object ({appIcon, appTitle}, used by renderWindow/minimize) so callers
  // don't need to normalize shapes before calling in.
  getAppIcon(entity) {
    const icon = entity.icon || entity.appIcon;
    if (icon) return icon;
    const label = entity.label || entity.appTitle || '';
    return label.charAt(0).toUpperCase() || '◫';
  }

  // Renders a crisp, consistent SVG glyph for known app icon keys, falling
  // back to the raw character (e.g. a letter) for anything unmapped.
  getIconMarkup(entity) {
    const icons = {
      '▣': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="1.5"></rect><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"></rect><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"></rect><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"></rect></svg>',
      '📁': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"></path></svg>',
      '✦': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.1 6.9 6.9 2.1-6.9 2.1L12 20.5l-2.1-6.9-6.9-2.1 6.9-2.1L12 2.5z"></path></svg>',
      '⚙': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle><rect x="10.7" y="1" width="2.6" height="3.4" rx="1" fill="currentColor"></rect><rect x="10.7" y="19.6" width="2.6" height="3.4" rx="1" fill="currentColor"></rect><rect x="1" y="10.7" width="3.4" height="2.6" rx="1" fill="currentColor"></rect><rect x="19.6" y="10.7" width="3.4" height="2.6" rx="1" fill="currentColor"></rect><rect x="10.7" y="1" width="2.6" height="3.4" rx="1" fill="currentColor" transform="rotate(45 12 12)"></rect><rect x="10.7" y="19.6" width="2.6" height="3.4" rx="1" fill="currentColor" transform="rotate(45 12 12)"></rect><rect x="1" y="10.7" width="3.4" height="2.6" rx="1" fill="currentColor" transform="rotate(45 12 12)"></rect><rect x="19.6" y="10.7" width="3.4" height="2.6" rx="1" fill="currentColor" transform="rotate(45 12 12)"></rect></svg>',
      '🎛': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="5" x2="4" y2="19"></line><circle cx="4" cy="10" r="2" fill="currentColor" stroke="none"></circle><line x1="12" y1="5" x2="12" y2="19"></line><circle cx="12" cy="15" r="2" fill="currentColor" stroke="none"></circle><line x1="20" y1="5" x2="20" y2="19"></line><circle cx="20" cy="8" r="2" fill="currentColor" stroke="none"></circle></svg>',
    };

    const key = this.getAppIcon(entity);
    return icons[key] || `<span>${key}</span>`;
  }

  applyTheme(theme) {
    if (!theme) return;

    this.theme = theme.id;
    this.themeColors = theme;

    if (this.root && typeof document !== 'undefined') {
      const target = document.documentElement;
      target.style.setProperty('--bg1', theme.bg1);
      target.style.setProperty('--bg2', theme.bg2);
      target.style.setProperty('--accent', theme.accent);
      target.style.setProperty('--accent-dark', theme.accentDark);
    }
  }

  applyBackgroundImage(url) {
    this.backgroundImage = url || null;

    if (this.root && typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--desktop-image', this.backgroundImage ? `url("${this.backgroundImage}")` : 'none');
    }
  }

  // ---- Browser-only rendering below (requires `root` and `document`) ----

  renderDesktop() {
    const root = document.createElement('div');
    root.className = 'desktop';

    const leftItems = this.topBar.left.map((item) => `<span>${item}</span>`).join('');
    const rightItems = this.topBar.right.map((item) => `<span>${item}</span>`).join('');

    root.innerHTML = `
      <div class="desktop-wallpaper"></div>
      <div class="topbar">
        <div class="left">${leftItems}</div>
        <div class="right">${rightItems}</div>
      </div>
      <div class="app-grid"></div>
      <div class="taskbar"></div>
    `;

    const grid = root.querySelector('.app-grid');
    const dock = root.querySelector('.taskbar');
    const rightBar = root.querySelector('.topbar .right');

    if (rightBar) {
      const logout = document.createElement('span');
      logout.className = 'logout-item';
      logout.textContent = 'Logout';
      logout.addEventListener('click', () => {
        const token = localStorage.getItem('was_token');
        localStorage.removeItem('was_token');
        localStorage.removeItem('was_user');
        if (token) {
          fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
            .catch(() => {})
            .finally(() => location.reload());
        } else {
          location.reload();
        }
      });
      rightBar.appendChild(logout);
    }

    const launchpadTrigger = document.createElement('div');
    launchpadTrigger.className = 'dock-item launchpad-trigger';
    launchpadTrigger.title = 'Launchpad';
    launchpadTrigger.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="5" height="5" rx="1.2"></rect><rect x="9.5" y="3" width="5" height="5" rx="1.2"></rect><rect x="16" y="3" width="5" height="5" rx="1.2"></rect><rect x="3" y="9.5" width="5" height="5" rx="1.2"></rect><rect x="9.5" y="9.5" width="5" height="5" rx="1.2"></rect><rect x="16" y="9.5" width="5" height="5" rx="1.2"></rect><rect x="3" y="16" width="5" height="5" rx="1.2"></rect><rect x="9.5" y="16" width="5" height="5" rx="1.2"></rect><rect x="16" y="16" width="5" height="5" rx="1.2"></rect></svg>';
    launchpadTrigger.addEventListener('click', () => this.openMenuOverlay(root, this.menus, 'Launchpad'));
    dock.appendChild(launchpadTrigger);

    const separator = document.createElement('div');
    separator.className = 'dock-separator';
    dock.appendChild(separator);

    // Desktop grid: the top-level menu tree as-is (folders and items mixed).
    this.menus.forEach((node) => {
      const handleClick = () => {
        if (node.type === 'group') {
          this.openMenuOverlay(root, node.children || [], node.label, { showBack: true });
          return;
        }
        this.onApplicationIconClick(node);
        if (typeof this.onIconClick === 'function') {
          this.onIconClick(node);
        }
      };

      const icon = document.createElement('div');
      icon.className = 'app-icon';
      icon.innerHTML = `
        <div class="glyph">${this.getIconMarkup(node)}</div>
        <div class="label">${node.label}</div>
      `;
      icon.addEventListener('click', handleClick);
      grid.appendChild(icon);
    });

    // Dock: every item (leaf) across the whole tree, flattened -- folders
    // don't appear here, matching how a real dock has no concept of them.
    this.flattenMenuItems(this.menus).forEach((item) => {
      const handleClick = () => {
        this.onApplicationIconClick(item);
        if (typeof this.onIconClick === 'function') {
          this.onIconClick(item);
        }
      };

      const dockItem = document.createElement('div');
      dockItem.className = 'dock-item';
      dockItem.innerHTML = this.getIconMarkup(item);
      dockItem.title = item.label;
      dockItem.addEventListener('click', handleClick);
      dock.appendChild(dockItem);
    });

    this.attachDockMagnify(dock);

    this.root.innerHTML = '';
    this.root.appendChild(root);
  }

  // macOS-style dock magnification: icons grow the closer the pointer gets
  // to their center. Growing real width/height (not a transform: scale)
  // makes the flex layout push neighbors apart instead of overlapping them,
  // and `align-items: flex-end` on .taskbar keeps everything bottom-anchored
  // so icons rise upward as they grow, exactly like the real macOS dock.
  attachDockMagnify(dock) {
    const BASE_SIZE = 50;
    const MAX_SIZE = 78;
    const RADIUS = 110;

    dock.addEventListener('mousemove', (event) => {
      dock.querySelectorAll('.dock-item').forEach((item) => {
        const rect = item.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const distance = Math.abs(event.clientX - center);
        const size = distance < RADIUS
          ? BASE_SIZE + (MAX_SIZE - BASE_SIZE) * (1 - distance / RADIUS)
          : BASE_SIZE;
        item.style.width = `${size}px`;
        item.style.height = `${size}px`;
      });
    });

    dock.addEventListener('mouseleave', () => {
      dock.querySelectorAll('.dock-item').forEach((item) => {
        item.style.width = '';
        item.style.height = '';
      });
    });
  }

  // Fullscreen overlay listing a set of menu nodes -- used both for the
  // Launchpad (the whole top-level tree) and for a folder's contents (opened
  // from the desktop grid or from within another overlay, which stacks a
  // new overlay on top of the one already showing). Clicking an item
  // launches its app and closes this overlay; clicking a nested folder
  // opens another overlay on top. Clicking the backdrop or pressing Escape
  // closes just the top overlay -- so does the Back button shown for folder
  // views (`showBack: true`), since closing the top overlay is exactly what
  // reveals whatever's underneath (the desktop, or the parent folder).
  openMenuOverlay(root, items, title, { showBack = false } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'launchpad-overlay';

    const closeOverlay = () => {
      overlay.style.opacity = '0';
      gridWrap.style.transform = 'scale(0.94)';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      document.removeEventListener('keydown', onKeydown);
    };

    const onKeydown = (event) => {
      if (event.key === 'Escape') closeOverlay();
    };

    if (showBack) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'launchpad-back';
      back.textContent = '← Back';
      back.addEventListener('click', (event) => {
        event.stopPropagation();
        closeOverlay();
      });
      overlay.appendChild(back);
    }

    if (title) {
      const heading = document.createElement('div');
      heading.className = 'launchpad-title';
      heading.textContent = title;
      overlay.appendChild(heading);
    }

    const gridWrap = document.createElement('div');
    gridWrap.className = 'launchpad-grid';

    (items || []).forEach((node) => {
      const item = document.createElement('div');
      item.className = 'launchpad-app';
      item.innerHTML = `
        <div class="glyph">${this.getIconMarkup(node)}</div>
        <div class="label">${node.label}</div>
      `;
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        if (node.type === 'group') {
          this.openMenuOverlay(root, node.children || [], node.label, { showBack: true });
          return;
        }
        this.onApplicationIconClick(node);
        if (typeof this.onIconClick === 'function') {
          this.onIconClick(node);
        }
        closeOverlay();
      });
      gridWrap.appendChild(item);
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeOverlay();
    });

    overlay.appendChild(gridWrap);
    root.appendChild(overlay);
    document.addEventListener('keydown', onKeydown);

    void overlay.offsetWidth;
    overlay.style.opacity = '1';
    gridWrap.style.transform = 'scale(1)';
  }

  renderWindow(application, startupResult = null) {
    const desktop = this.root.querySelector('.desktop');
    if (!desktop) return;

    const dock = desktop.querySelector('.taskbar');

    const windowData = startupResult && startupResult.window;

    const positionX = windowData?.positionX ?? 330;
    const positionY = windowData?.positionY ?? 110;
    const width = windowData?.width ?? 640;
    const height = windowData?.height ?? 420;
    const title = (windowData && windowData.title) || application.appTitle;

    const win = document.createElement('div');
    win.className = 'window';
    win.dataset.appId = application.appID;
    win.style.left = `${positionX}px`;
    win.style.top = `${positionY}px`;
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
    win.style.opacity = '0';
    win.style.transform = 'scale(0.92)';

    win.innerHTML = `
      <div class="window-header">
        <div class="window-controls">
          <button type="button" class="window-action close" aria-label="Close window">&times;</button>
          <button type="button" class="window-action minimize" aria-label="Minimize window">&minus;</button>
          <button type="button" class="window-action maximize" aria-label="Maximize window">&plus;</button>
        </div>
        <div class="window-title">${this.getIconMarkup(application)} ${title}</div>
        <div></div>
      </div>
      <div class="window-body">
        <div class="app-shell"></div>
      </div>
      <div class="resize-handle" aria-hidden="true"></div>
    `;

    const body = win.querySelector('.app-shell');
    const controls = windowData && Array.isArray(windowData.controls) ? windowData.controls : [];

    if (controls.length > 0) {
      controls.forEach((control) => body.appendChild(this.wrapControl(control, application.appID)));
    } else {
      const empty = document.createElement('p');
      empty.textContent = `"${application.appTitle}" did not return any window content.`;
      body.appendChild(empty);
    }

    const header = win.querySelector('.window-header');
    const closeBtn = win.querySelector('.close');
    const minimizeBtn = win.querySelector('.minimize');
    const maximizeBtn = win.querySelector('.maximize');
    const resizeHandle = win.querySelector('.resize-handle');

    let minimizedItem = null;

    const removeMinimizedItem = () => {
      if (minimizedItem) {
        minimizedItem.remove();
        minimizedItem = null;
      }
    };

    closeBtn.addEventListener('click', () => {
      removeMinimizedItem();
      win.style.opacity = '0';
      win.style.transform = 'scale(0.92)';
      win.addEventListener('transitionend', () => win.remove(), { once: true });
    });

    minimizeBtn.addEventListener('click', () => {
      win.style.opacity = '0';
      win.style.transform = 'scale(0.92) translateY(40px)';
      win.addEventListener('transitionend', () => {
        win.style.display = 'none';
      }, { once: true });

      if (!minimizedItem && dock) {
        minimizedItem = document.createElement('div');
        minimizedItem.className = 'dock-item';
        minimizedItem.innerHTML = this.getIconMarkup(application);
        minimizedItem.title = title;
        minimizedItem.addEventListener('click', () => {
          removeMinimizedItem();
          win.style.display = 'block';
          void win.offsetWidth;
          win.style.opacity = '1';
          win.style.transform = 'scale(1) translateY(0)';
        });
        dock.appendChild(minimizedItem);
      }
    });

    maximizeBtn.addEventListener('click', () => {
      win.style.transition = 'opacity 0.22s var(--spring), transform 0.22s var(--spring), left 0.28s var(--spring), top 0.28s var(--spring), width 0.28s var(--spring), height 0.28s var(--spring)';
      win.addEventListener('transitionend', () => {
        win.style.transition = '';
      }, { once: true });

      const isMax = win.dataset.maximized === 'true';
      if (isMax) {
        win.dataset.maximized = 'false';
        win.style.left = win.dataset.preMaxLeft;
        win.style.top = win.dataset.preMaxTop;
        win.style.width = win.dataset.preMaxWidth;
        win.style.height = win.dataset.preMaxHeight;
        return;
      }

      win.dataset.preMaxLeft = win.style.left;
      win.dataset.preMaxTop = win.style.top;
      win.dataset.preMaxWidth = win.style.width;
      win.dataset.preMaxHeight = win.style.height;

      win.dataset.maximized = 'true';
      win.style.left = '0';
      win.style.top = '30px';
      win.style.width = '100vw';
      win.style.height = 'calc(100vh - 110px)';
    });

    header.addEventListener('mousedown', (event) => {
      if (win.dataset.maximized === 'true') return;
      if (event.target.closest('.window-action')) return;
      event.preventDefault();

      desktop.appendChild(win);

      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = parseFloat(win.style.left) || 0;
      const startTop = parseFloat(win.style.top) || 0;

      const onMouseMove = (moveEvent) => {
        win.style.left = `${startLeft + (moveEvent.clientX - startX)}px`;
        win.style.top = `${startTop + (moveEvent.clientY - startY)}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    resizeHandle.addEventListener('mousedown', (event) => {
      if (win.dataset.maximized === 'true') return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const startWidth = parseFloat(win.style.width) || win.offsetWidth;
      const startHeight = parseFloat(win.style.height) || win.offsetHeight;

      const onMouseMove = (moveEvent) => {
        win.style.width = `${Math.max(240, startWidth + (moveEvent.clientX - startX))}px`;
        win.style.height = `${Math.max(160, startHeight + (moveEvent.clientY - startY))}px`;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    desktop.appendChild(win);
    void win.offsetWidth;
    win.style.opacity = '1';
    win.style.transform = 'scale(1)';
  }

  // Each control class owns its own DOM rendering (a static renderElement
  // method), so WiseDesktop just looks it up by type and calls it. See
  // WiseControlRegistry, populated by system/controls/*.js when loaded in
  // the browser.
  renderControl(control, appId) {
    const registry = window.WiseControlRegistry;
    const ControlClass = registry[control.type] || registry.WiseControl;
    return ControlClass.renderElement(control, { appId, desktop: this });
  }

  // Wraps a control's own markup in a container keyed by control id. The
  // wrapper -- not the control's internal DOM shape, which varies by type
  // (e.g. WiseCheckboxGroup has no single root carrying the id) -- is what
  // lets patchWindowControls add/remove whole controls generically later.
  wrapControl(control, appId) {
    const wrapper = document.createElement('div');
    if (control.id) wrapper.dataset.controlWrapper = control.id;
    wrapper.appendChild(this.renderControl(control, appId));
    return wrapper;
  }

  // Collects the current value of every control in a window, keyed by
  // control id, by asking each control's own class how to read itself back
  // out of the DOM (see gatherValue on each system/controls/*.js class).
  gatherControlValues(winEl) {
    const registry = window.WiseControlRegistry;
    const values = {};
    const seen = new Set();

    winEl.querySelectorAll('[data-control-id]').forEach((node) => {
      const id = node.dataset.controlId;
      if (seen.has(id)) return;
      seen.add(id);

      const ControlClass = registry[node.dataset.controlType] || registry.WiseControl;
      if (typeof ControlClass.gatherValue !== 'function') return;

      const value = ControlClass.gatherValue(winEl, id);
      if (value !== undefined) {
        values[id] = value;
      }
    });

    return values;
  }

  // Runs the control's real handler on the server, against the same live
  // window instance, then patches the DOM with whatever changed. This is
  // what lets an app author attach any function as a control's event
  // handler without also teaching the browser how to simulate it.
  async sendControlEvent(appId, controlId, sourceEl, eventName = 'click', overrideValues = {}) {
    const winEl = sourceEl.closest('.window');
    if (!winEl) return;

    const values = this.gatherControlValues(winEl);
    Object.assign(values, overrideValues);

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('was_token') : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`/api/applications/${appId}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ controlId, event: eventName, values }),
    });
    const result = await response.json();

    if (result.window && Array.isArray(result.window.controls)) {
      this.patchWindowControls(winEl, result.window.controls);
    }

    if (result.theme) {
      this.applyTheme(result.theme);
    }

    if (result.backgroundImage !== undefined) {
      this.applyBackgroundImage(result.backgroundImage);
    }
  }

  // Diffs the window's controls against what's currently in the DOM, keyed
  // by the wrapper divs from wrapControl(): existing ids are patched in
  // place (see patchElement on each system/controls/*.js class), new ids
  // are rendered and appended, and ids no longer present are removed. This
  // lets an app's control list grow or shrink between events (e.g. a row
  // disappearing once its item is handled), not just change value.
  patchWindowControls(winEl, controls) {
    const registry = window.WiseControlRegistry;
    const body = winEl.querySelector('.app-shell');
    const appId = winEl.dataset.appId;
    const seen = new Set();

    controls.forEach((control) => {
      if (control.id) seen.add(control.id);

      const wrapper = control.id ? winEl.querySelector(`[data-control-wrapper="${control.id}"]`) : null;
      if (wrapper) {
        const ControlClass = registry[control.type] || registry.WiseControl;
        if (typeof ControlClass.patchElement === 'function') {
          ControlClass.patchElement(winEl, control);
        }
      } else if (body) {
        body.appendChild(this.wrapControl(control, appId));
      }
    });

    winEl.querySelectorAll('[data-control-wrapper]').forEach((node) => {
      if (!seen.has(node.dataset.controlWrapper)) {
        node.remove();
      }
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WiseDesktop;
}
