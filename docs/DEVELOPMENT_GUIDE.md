# Building an Application for Wiseape Application System (WAS)

> Read `docs/ARCHITECTURE.md` first if you haven't — this guide assumes you
> already know *why* the system is shaped the way it is (isomorphic files,
> the generic control-event round trip, per-user context propagation). This
> document is the *how*: a step-by-step tutorial with working code, plus a
> reference table of every built-in control.

## 0. Running the dev server

```bash
node --watch --env-file=.env app.js
```

`--watch` restarts the process whenever a server-side file changes.
Anything served straight to the browser (`system/**/*.js`, `public/**`) is
re-read from disk on every request, so a browser refresh alone is enough
for pure front-end-rendering changes — but if you touched anything that
runs *inside* the Node process (an application's `App*.js`/`Win*.js`, a
repository, `WiseApplicationSystem.js`, `app.js` itself), the process needs
to restart, which `--watch` does automatically. `.env` holds DB credentials
(gitignored; copy `.env.example`).

## 1. Anatomy of an application

```
applications/
  MyApp/
    AppMyApp.js              <- extends WiseApplication; entry point
    forms/
      WinMyApp.js             <- extends WiseWindow; builds the UI
    assets/
      icons/
        icon.svg              <- optional; a colorful 128x128 app icon
```

An application is **two classes**:

- `AppMyApp` (`WiseApplication` subclass) — its only real job is
  `run(appConfig, appParameter)`, which creates the app's main window via
  `this.createWindow(WinMyApp, {...})` and calls `.show()` on it.
- `WinMyApp` (`WiseWindow` subclass) — everything the user actually sees:
  controls, layout, event handlers.

Nothing needs to be registered in code to "install" the app — it's data in
the database (see §7). `WiseApplicationSystem.resolveApplicationClass`
`require()`s whatever file the `wiseape_apps.app_start_point` column points
to (e.g. `applications/MyApp/AppMyApp.js:AppMyApp`).

## 2. The smallest possible app

This is `applications/HelloWorld` verbatim — read it as the minimal
reference before building something more complex.

`applications/HelloWorld/AppHelloWorld.js`:

```js
const WiseApplication = require('../../system/WiseApplication');
const WinHello = require('./forms/WinHello');

class AppHelloWorld extends WiseApplication {
  run(appConfig = {}, appParameter = {}) {
    const helloWindow = this.createWindow(WinHello);
    helloWindow.show(appParameter);

    return {
      appID: this.appID,
      appTitle: this.appTitle,
      status: 'started',
      window: helloWindow.toJSON(),
    };
  }
}

module.exports = AppHelloWorld;
```

`applications/HelloWorld/forms/WinHello.js`:

```js
const WiseWindow = require('../../../system/WiseWindow');
const WiseLabel = require('../../../system/controls/WiseLabel');
const WiseTextBox = require('../../../system/controls/WiseTextBox');
const WiseButton = require('../../../system/controls/WiseButton');

class WinHello extends WiseWindow {
  constructor(options = {}) {
    super(options);
    this.title = 'Hello World';
    this.appTitle = options.appTitle || 'HelloWorld';
    this.appIcon = options.appIcon || '✦';
    this.width = '900';
    this.height = '700';
  }

  // Called synchronously right after the window is constructed (by
  // createWindow()). Build every control here and register it with
  // addControl() -- that's what makes `this.txtName` etc. resolve later.
  onWindowInit() {
    this.controls = [];
    this.addControl(new WiseLabel('Hello World', { id: 'lblHello', style: { fontSize: 32 } }));
    this.addControl(new WiseTextBox('Enter your name', { id: 'txtName' }));
    this.addControl(new WiseButton('Say Hello', { id: 'btnSay', onClick: this.sayHelloAgain.bind(this) }));
    return this;
  }

  // A plain method. `.bind(this)` above is what makes `this` resolve to
  // the window here, regardless of how the framework invokes it later.
  sayHelloAgain() {
    this.lblHello.text('Hello, ' + this.txtName.value);
  }

  show(param = null) {
    this.visible = true;
    this.params = param;
    return super.show(param);
  }
}

module.exports = WinHello;
```

That's a complete, working app. Three things to internalize from this
example:

- **`onWindowInit()` is synchronous** and is where you build `this.controls`.
  If you need data from the database before the window can render properly,
  do *not* make `onWindowInit` async — see §6 for the correct pattern.
- **`addControl(control)`** both pushes the control into `this.controls`
  (which becomes the JSON sent to the browser) *and* registers it as
  `this[control.id]` — that's the only reason `this.lblHello` and
  `this.txtName` work inside `sayHelloAgain`.
- **Every event handler is `this.methodName.bind(this)`.** This is the
  entire "event handling" story — there is no separate registration step.

## 3. The control catalog

Import path for all of these: `require('../../../system/controls/<Name>')`
(adjust `../` depth to your file's location).

Every control's `options` object accepts, in addition to what's listed
below: `id` (string — required if you want to read/reference it later),
`dataField` (string — key used by `WiseWindow.getValues()`, defaults to
`id`), `visible` (bool, default `true`), `style` (plain object of CSS
properties, e.g. `{ fontSize: 15, marginTop: '8px' }`).

| Control | Constructor | Key options | `isInput`? |
|---|---|---|---|
| `WiseLabel` | `new WiseLabel(text, options)` | — | no |
| `WiseTextBox` | `new WiseTextBox(placeholder, options)` | `value` | yes |
| `WiseTextArea` | `new WiseTextArea(value, options)` | `placeholder`, `rows`, `onChange` | yes |
| `WiseButton` | `new WiseButton(label, options)` | `onClick` | no |
| `WiseComboBox` | `new WiseComboBox(items, options)` | `items: [{value,label}]`, `value`, `onChange` | yes |
| `WiseRadioGroup` | `new WiseRadioGroup(items, options)` | same as combo box | yes |
| `WiseCheckboxGroup` | `new WiseCheckboxGroup(items, options)` | `value: string[]`, `onChange` | yes |
| `WiseDate` | `new WiseDate(value, options)` | `onChange` | yes |
| `WiseDateRange` | `new WiseDateRange(value, options)` | `value: {start,end}`, `onChange` | yes |
| `WiseHtmlEditor` | `new WiseHtmlEditor(html, options)` | `onChange` (fires on blur) | yes |
| `WiseFileUpload` | `new WiseFileUpload(label, options)` | `accept`, `onChange` | yes |
| `WiseTableLayout` | `new WiseTableLayout(options)` | `rows`, `columns` | container |
| `WiseTabControl` | `new WiseTabControl(options)` | — | container |
| `WiseDataTable` | `new WiseDataTable(options)` | see §5 | container |

`isInput: yes` means the control's value is included in
`WiseWindow.getValues()` (see §4). `WiseLabel`/`WiseButton` are display/
action-only and excluded. Container controls (`WiseTableLayout`,
`WiseTabControl`, `WiseDataTable`) don't have a value of their own — their
*nested* controls contribute instead.

### Example: most of the catalog in one window

```js
this.addControl(new WiseLabel('Favorite Color', { id: 'lblColor', style: { fontWeight: 700 } }));
this.addControl(new WiseRadioGroup(
  [{ value: 'red', label: 'Red' }, { value: 'blue', label: 'Blue' }],
  { id: 'radioColor', value: 'blue', dataField: 'color' }
));

this.addControl(new WiseComboBox(
  [{ value: 'eng', label: 'Engineering' }, { value: 'sales', label: 'Sales' }],
  { id: 'cmbDept', dataField: 'department', onChange: this.onDeptChange.bind(this) }
));

this.addControl(new WiseCheckboxGroup(
  [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }],
  { id: 'checkOptions', value: ['a'], dataField: 'options' }
));

this.addControl(new WiseDate('', { id: 'dateBirthday', dataField: 'birthday' }));
this.addControl(new WiseTextArea('', { id: 'txtBio', placeholder: 'Tell us...', rows: 3, dataField: 'bio' }));
this.addControl(new WiseFileUpload('Choose Avatar...', { id: 'uploadAvatar', dataField: 'avatar' }));
```

### Layout containers

`WiseTableLayout` places controls into an HTML-table-like grid, with
`colSpan`/`rowSpan` support:

```js
const table = new WiseTableLayout({ id: 'tableContact', rows: 2, columns: 2 });
table.setCell(0, 0, new WiseLabel('Name', { style: { fontWeight: 600 } }));
table.setCell(0, 1, new WiseTextBox('', { id: 'txtName', dataField: 'name' }));
table.setCell(1, 0, new WiseLabel('This spans both columns', {}), { colSpan: 2 });
this.addControl(table); // registers txtName as this.txtName automatically
```

`WiseTabControl` groups controls into tabs:

```js
const tabs = new WiseTabControl({ id: 'tabsDemo' });
tabs.addTab('Profile', [new WiseTextBox('', { id: 'txtNickname', dataField: 'nickname' })]);
tabs.addTab('Preferences', [new WiseCheckboxGroup([...], { id: 'checkPrefs', dataField: 'prefs' })]);
this.addControl(tabs);
```

**Rule:** any control you build that holds other controls *must* implement
`getChildControls()` (returns a flat array of every nested control, so
`WiseWindow.addControl` can auto-register their ids) **and** a
`static patchElement()` that delegates to each child's own `patchElement`
— see `docs/ARCHITECTURE.md` §2 point 5 for why skipping this corrupts the
DOM on the next unrelated event.

## 4. Reading form values

Don't hand-write `{ name: this.txtName.value, ... }` for every field —
`WiseWindow.getValues()` already does this generically:

```js
onSubmit() {
  const values = this.getValues();
  // { name: '...', department: 'eng', options: ['a'], birthday: '2024-01-01', ... }
  // keyed by each control's dataField (defaults to its id), only for
  // isInput controls (labels/buttons excluded), including nested controls
  // inside WiseTableLayout/WiseTabControl.
}
```

## 5. `WiseDataTable` — displaying and editing tabular data

This is the control to reach for whenever an app needs to show rows from
the database with paging, sorting, and inline editing. Full walkthrough
using `applications/Controls/forms/WinControls.js` (real, working code) as
the reference.

```js
const WiseDataTable = require('../../../system/controls/WiseDataTable');

// 1. Create it with paging config and the two top-level events:
const dtEmployees = new WiseDataTable({
  id: 'dtEmployees',
  pageSize: 5,
  pageSizeOptions: [5, 10, 20],
  onDataFilterChanged: this.onEmployeesFilterChanged.bind(this), // (pageSize, currentPage)
  onRowSelect: this.onEmployeeRowSelect.bind(this),               // (rowData)
});

// 2. Define columns. type defaults to 'text'; other types render an
//    interactive control per cell and fire their own handler:
dtEmployees.setColumns([
  { dataField: 'name', header: 'Name', width: 170 },
  {
    dataField: 'department', header: 'Department', width: 160, type: 'combobox',
    items: ['Engineering', 'Sales'], onChange: this.onDeptChange.bind(this), // (row, newValue, rowIndex)
  },
  {
    dataField: 'active', header: 'Active', width: 80, sortable: false, type: 'checkbox',
    onChange: this.onActiveChange.bind(this),
  },
  {
    dataField: 'actions', header: '', width: 100, sortable: false, type: 'button',
    label: 'Edit', onClick: this.onEditRow.bind(this), // (row, rowIndex)
  },
]);
this.addControl(dtEmployees);
```

```js
// 3. Feed it exactly one page of data at a time -- it never holds the
//    whole dataset. You decide how "a page" is computed (usually: a DB
//    query with LIMIT/OFFSET).
async applyEmployeesPage(pageSize, page) {
  const offset = (page - 1) * pageSize;
  const { rows, totalCount } = await this.system.employeeRepository.listEmployees({ limit: pageSize, offset });
  this.dtEmployees.pageSize = pageSize;
  this.dtEmployees.currentPage = page;
  this.dtEmployees.setData(rows, totalCount);
}

// 4. onDataFilterChanged fires whenever the user changes page or page size
//    -- just re-run the same query with the new numbers.
async onEmployeesFilterChanged(pageSize, page) {
  await this.applyEmployeesPage(pageSize, page);
}

async onDeptChange(row, newValue) {
  await this.system.employeeRepository.updateEmployee(row.id, { department: newValue });
}
```

`type: 'radiobutton'` works the same way as `checkbox`/`combobox` (an
`items` array, an `onChange(row, newValue, rowIndex)`). Column types
available: `'text'` (default, read-only), `'button'`, `'checkbox'`,
`'combobox'`, `'radiobutton'`.

Since `onWindowInit()` must stay synchronous but the first page of data
needs a database round trip, the standard pattern is:

```js
// WinMyApp.js
onWindowInit() {
  this.controls = [];
  // ... build dtEmployees as above, with EMPTY data ...
  return this;
}

async loadInitialData() {
  await this.applyEmployeesPage(this.dtEmployees.pageSize, this.dtEmployees.currentPage);
}
```

```js
// AppMyApp.js
async run(appConfig, appParameter) {
  const win = this.createWindow(WinMyApp, { /* ... */ });
  await win.loadInitialData(); // <-- awaited here, before show()
  win.show(appParameter);
  return { appID: this.appID, appTitle: this.appTitle, status: 'started', window: win.toJSON() };
}
```

## 6. Talking to the database from an application

Follow the exact repository pattern used throughout `system/Postgres*.js` —
don't invent a new style. Put a new repository at `system/PostgresXRepository.js`
(or co-locate it under your app's folder if it's truly app-specific — both
exist in this codebase; `system/` is for anything another app might also
want to reuse).

```js
const { Client } = require('pg');

class PostgresNoteRepository {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.DB_HOST,
      database: config.database || process.env.DB_NAME || 'wiseape-application-system',
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      port: config.port || process.env.DB_PORT || 5432,
      ssl: config.ssl !== undefined ? config.ssl : { rejectUnauthorized: false },
      ...config,
    };
  }

  async connect() {
    if (!this.client) {
      this.client = new Client(this.config);
      // REQUIRED -- without this, a dropped connection later on crashes the
      // whole Node process (Node's default behavior for an unhandled
      // EventEmitter 'error'). Just drop the dead client; the next call
      // reconnects fresh.
      this.client.on('error', (error) => {
        console.warn('[WAS] PostgreSQL connection lost; will reconnect on next request.', error.message);
        this.client = null;
      });
      await this.client.connect();
    }
    return this.client;
  }

  async ensureTable(client) {
    if (this.tableReady) return;
    await client.query(`
      CREATE TABLE IF NOT EXISTS wiseape_notes (
        note_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    this.tableReady = true;
  }

  async listNotesForUser(userId) {
    const client = await this.connect();
    await this.ensureTable(client);
    const result = await client.query(
      'SELECT note_id AS id, body, created_at AS "createdAt" FROM wiseape_notes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async addNote(userId, body) {
    const client = await this.connect();
    await this.ensureTable(client);
    await client.query('INSERT INTO wiseape_notes (user_id, body) VALUES ($1, $2)', [userId, body]);
  }
}

module.exports = PostgresNoteRepository;
```

Wire it into the system once, in `system/WiseApplicationSystem.js`'s
constructor (alongside the existing repositories):

```js
const PostgresNoteRepository = require('./PostgresNoteRepository');
// ...
if (isServer) {
  // ...
  this.noteRepository = new PostgresNoteRepository(options.db || {});
}
```

Now any window can reach it via `this.system.noteRepository` (see §8 for
why `this.system` is always available).

## 7. Registering the app and adding it to a menu

Apps and menus live in the database, not in code — `wiseape_apps` and
`wiseape_menus`. Both tables auto-seed a couple of demo rows on first boot
(see `PostgresAppRepository`/`PostgresMenuRepository`), but for a new app
you insert directly:

```sql
INSERT INTO wiseape_apps (app_id, app_title, app_version, app_developer, app_icon, app_start_point, app_config, app_parameter)
VALUES ('notes', 'Notes', '1.0.0', 'Wiseape', '📝',
        'applications/Notes/AppNotes.js:AppNotes', '{}', '{}');

-- Add it to the desktop as a top-level menu item (or nest it into a group
-- by setting parent_id to an existing group's menu_id):
INSERT INTO wiseape_menus (parent_id, menu_type, label, app_id, sort_order)
VALUES (NULL, 'item', 'Notes', 'notes', 2);
```

`app_icon` is the *fallback glyph* (used only if `assets/icons/icon.svg`
doesn't exist, or hasn't loaded yet) — see §9 for the real per-app icon
file. `app_start_point` is `<relative path from project root>:<exported
class name>`, exactly how you'd `require()` it.

## 8. Per-user context inside a window

Every `WiseWindow` instance carries `this.system` (the shared
`WiseApplicationSystem`, giving access to every repository) and
`this.currentUser` (a snapshot of whoever opened this app —
`{ id, name, email, role, themeId, backgroundImage }`, or `null` if nobody
is logged in). Both propagate automatically through `createWindow()`, so a
dialog opened from within a window also has them — you never set these
yourself.

```js
onWindowInit() {
  this.controls = [];
  if (this.currentUser) {
    this.addControl(new WiseLabel(`Logged in as ${this.currentUser.name}`, { id: 'lblUser' }));
  }
  if (this.currentUser && this.currentUser.role === 'admin') {
    // build an admin-only section
  }
  return this;
}

async onAddNote() {
  await this.system.noteRepository.addNote(this.currentUser.id, this.txtNewNote.value);
}
```

**Gotcha:** if a handler updates something on `this.currentUser` in the
database (a preference, a role, ...), also mutate `this.currentUser` in
memory afterward (`this.currentUser.themeId = saved.themeId`). The running
app instance's `currentUser` is a point-in-time snapshot, and
`dispatchControlEvent` reads it — not the database — when echoing
theme/background back on every subsequent event in that same window's
lifetime. See `applications/Settings/forms/WinSettings.js#onThemeChange` for
the reference implementation.

## 9. Opening another window (dialogs)

Any `WiseWindow` can open another one — it doesn't have to be the app's
first/main window:

```js
onOpenDialog() {
  const about = this.createWindow(WinAbout, { positionX: 460, positionY: 160 });
  about.show();
}
```

The framework detects the new window automatically (see
`docs/ARCHITECTURE.md` §5) and tells the browser to render it — no extra
wiring needed on your end beyond calling `createWindow()` + `.show()`.

## 10. Giving your app a colorful icon

Drop a `128×128` SVG at `applications/<AppName>/assets/icons/icon.svg`. Make
the background rect span the full canvas edge-to-edge (no inset margin —
the container it's placed in has no border once a real icon loads):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="128" height="128" rx="28" fill="url(#bg)"/>
  <g transform="translate(32,32) scale(2.6667)" fill="#ffffff">
    <!-- your glyph, drawn on a 24x24 grid, translate/scale already centers it -->
  </g>
</svg>
```

No route registration needed — `GET /app-assets/:appId/icon.svg` in `app.js`
already resolves any app's icon from its `appStartPoint` automatically. If
the file doesn't exist, the desktop/dock/Launchpad silently fall back to
the `app_icon` glyph from the database.

## 11. Testing checklist before calling a feature done

1. `node --check <every file you touched>` — syntax errors fail loudly and
   instantly, cheaper than finding them via the browser.
2. Restart the dev server (`node --watch --env-file=.env app.js` — kill any
   stale `node app.js`/`node --watch` processes first; they accumulate
   across long sessions and will fight over the port).
3. Actually open the app in a browser (or drive it headlessly with
   Playwright) — a syntax check proves the file parses, not that the
   feature works. Click the actual control, confirm the actual DOM update,
   check the browser console for errors.
4. If you added a database-backed feature, verify the write actually
   persisted — re-fetch from a *fresh* app/window instance (or a fresh
   login) rather than trusting the just-mutated in-memory object.

## 12. Common pitfalls (from real bugs hit during development)

- **Forgetting `patchElement` on a container control** silently wipes its
  children on the next unrelated event in the same window. Always pair
  `getChildControls()` with a delegating `patchElement`.
- **Two control files declaring the same top-level `const` name** without
  the IIFE wrapper breaks every control file loaded after it, silently (no
  error visible unless you check the browser console). Always wrap a new
  control file's entire body in `(function () { ... })();`.
- **Radio buttons across two windows of the same app** need their `name`
  attribute scoped per window instance (`${windowId}-${controlId}`), not
  just per control id — otherwise the browser treats them as one native
  radio group across the whole page and selecting one un-checks the other
  window's. `WiseRadioGroup` already does this; keep the pattern if you
  build a new control with native radio inputs.
- **An unhandled `pg` Client `'error'` event crashes the whole server**, not
  just the one request — every repository's `connect()` must attach the
  error listener described in §6.
- **`onWindowInit()` must stay synchronous.** If you need async setup data,
  add a separate `async loadInitialData()` method and `await` it from the
  app's `run()`, after `createWindow()` and before `.show()`.
