# WAS API Reference

> Companion to `docs/ARCHITECTURE.md` (concepts) and `docs/DEVELOPMENT_GUIDE.md`
> (tutorial). This document is a systematic reference of every class,
> property, and method in the system. "Isomorphic" below means the file
> runs both in Node and in the browser from the same source (see
> ARCHITECTURE.md §2).

---

## `system/WiseApplicationSystem.js` — isomorphic

The orchestrator. Server: one instance per process, owns the Postgres
repositories and every running app. Browser: one instance per tab, talks to
the server exclusively over `fetch`.

### Constructor

`new WiseApplicationSystem(options = {})`

| Option | Where used | Meaning |
|---|---|---|
| `options.db` | server | passed through to every `Postgres*Repository` constructor |
| `options.root` | browser | the DOM element `WiseDesktop` renders into |
| `options.user` | browser | the logged-in user object (`{id,name,email,role,themeId,backgroundImage}`), from the auth flow |
| `options.token` | browser | the session bearer token, attached to every subsequent `fetch` |

### Properties

| Property | Type | Meaning |
|---|---|---|
| `apps` | `WiseApplication[]` (server) / plain JSON (browser) | every installed app |
| `menus` | tree of menu nodes | see `buildMenuTree` below |
| `themes` | array | available desktop themes |
| `activeThemeId` / `backgroundImage` | string/null | server-side fallback values; per-user values take priority on the client (ARCHITECTURE.md §8) |
| `runningApplications` | `Map<appId, WiseApplication instance>` | server only. **One entry per appId, process-wide** — see ARCHITECTURE.md §9 for the concurrency caveat |
| `repository` / `themeRepository` / `employeeRepository` / `authRepository` / `menuRepository` | server only | the Postgres repositories |
| `currentUser` / `authToken` | browser only | set from constructor options |
| `desktop` | `WiseDesktop` instance | created inside `run()` |

### Methods

- **`async run()`** — loads apps, menus, themes; creates the `WiseDesktop`;
  applies the initial theme/background (per-user on the client); calls
  `desktop.run(apps, currentUser, menus)`. Call this once, right after
  construction.
- **`async loadApplications()`** — server: queries `PostgresAppRepository`.
  Browser: `GET /api/apps`.
- **`async loadMenus()`** — server: queries `PostgresMenuRepository`, then
  `buildMenuTree`. Browser: `GET /api/menus` (already-built tree).
- **`buildMenuTree(rows)`** — server only. Turns the flat `wiseape_menus`
  row list into a nested tree (`children[]`), resolving each node's
  effective `icon` (explicit → linked app's `appIcon` → `'📁'`/`'◫'`
  default) and sorting by `sortOrder` then `label`.
- **`async loadThemes()`** — server: `PostgresThemeRepository.listThemes()`.
  Browser: `GET /api/themes`.
- **`getActiveTheme()`** — returns the theme object matching
  `this.activeThemeId` (or the first theme, or `null`).
- **`getThemeById(themeId)`** — same lookup for an arbitrary id.
- **`setActiveTheme(themeId)`** — throws if unknown; updates
  `this.activeThemeId` and calls `this.desktop.applyTheme(theme)` if a
  desktop exists. Returns the theme.
- **`setBackgroundImage(url)`** — updates `this.backgroundImage`, calls
  `this.desktop.applyBackgroundImage(...)`.
- **`resolveApplicationClass(app)`** — server only. Parses
  `app.appStartPoint` (`"<relativePath>:<ClassName>"`), `require()`s the
  file, returns the named export (or the module's default export, or
  `WiseApplication` as a last resort).
- **`async runApplication(appId, user = null)`** —
  - Browser branch: `POST /api/applications/run` (with
    `Authorization: Bearer <this.authToken>`), then
    `this.desktop.renderWindow(result.application, result.startupResult)`.
  - Server branch: finds the app, resolves its class, instantiates it,
    sets `instance.system = this` and `instance.currentUser = user`, awaits
    `instance.run(app.appConfig, app.appParameter)`, stores the instance in
    `runningApplications` keyed by `appId` (**overwriting** any previous
    instance for that id).
- **`collectWindows(win)`** — server only. Flattens a window and every
  window it (transitively) opened via `createWindow()`
  (`win.childWindows`), depth-first.
- **`async dispatchControlEvent(appId, controlId, eventName, values = {}, args = [])`**
  — server only; the heart of the control-event round trip (full sequence
  diagram in ARCHITECTURE.md §5). Finds the running instance for `appId`,
  finds whichever window (top-level or child) owns `controlId`, syncs
  `values` onto matching sibling controls' `.value`, resolves
  `` control[`on${Capitalize(eventName)}`] `` and `await`s
  `handler.apply(control, args)`, diffs windows before/after to detect any
  newly-opened ones, and returns
  `{ window, theme, backgroundImage, newWindows }` (theme/background read
  from `instance.currentUser` if present, otherwise the process-wide
  fallback).
- **`getSystemSnapshot()`** — returns `{ system, apps, desktop }` for the
  (largely legacy/unused-by-the-client) `GET /api/system` route.

---

## `system/WiseDesktop.js` — isomorphic

Renders the desktop shell: top bar, dock, desktop icon grid, windows,
Launchpad. Contains **no per-control-type rendering logic** — it delegates
to whatever class is registered under a control's `type` in
`window.WiseControlRegistry`.

### Constructor

`new WiseDesktop(root = null)` — `root` is the DOM element to render into
(browser only; omitted server-side, where only `run()`'s returned snapshot
matters).

### Properties

`apps`, `menus`, `topBar` (`{left: string[], right: string[]}`), `theme`,
`currentUser`, `onIconClick` (callback set externally by
`WiseApplicationSystem`).

### Methods

- **`run(apps = [], user = null, menus = [])`** — stores `apps`/`menus`/
  `user`, builds the snapshot, and (if `this.root` is set) calls
  `renderDesktop()`. Returns the snapshot.
- **`buildSnapshot(apps)`** — plain JSON describing the desktop (theme,
  apps, topBar, dock) — used for both the return value of `run()` and (on
  the server) `getSystemSnapshot()`.
- **`escapeHtml(text)`** — HTML-escapes a string before it's spliced into
  `innerHTML` (used for the logged-in user's display name in the top bar,
  which is user-controlled input from registration).
- **`onApplicationIconClick(app)`** — returns a small event-description
  object; also invoked as a side effect whenever an icon is clicked.
- **`getAppIcon(app)`** — `app.appIcon || app.appTitle.charAt(0).toUpperCase()`.
- **`getIconMarkup(app)`** — returns the HTML markup for one icon. Looks up
  a small built-in table of hand-drawn monochrome SVG glyphs by icon
  character (`▣ 📁 ✦ ⚙ 🎛`), falling back to a raw `<span>`. If `app.appID`
  or `app.appId` is present, instead returns
  `<img src="/app-assets/<id>/icon.svg">` (with an `onload` that adds
  `icon-loaded` to strip the container's frame, and an `onerror` that swaps
  back to the glyph fallback, kept alongside as a hidden sibling
  `<span class="icon-fallback">`). Menu groups/folders (no app id) always
  use the glyph path.
- **`applyTheme(theme)`** — sets CSS custom properties (`--bg1 --bg2
  --accent --accent-dark`) on `document.documentElement`.
- **`applyBackgroundImage(url)`** — sets `--desktop-image`.
- **`renderDesktop()`** *(browser only)* — builds the whole `.desktop` DOM
  tree: top bar (+ Logout button if `currentUser`), dock (Launchpad trigger
  + separator + one `.dock-item` per app — always the flat app list), and
  the desktop icon grid (one `.app-icon` per top-level **menu** node —
  groups open `openMenuFolder`, items call `launchMenuItem`). Calls
  `attachDockMagnify`.
- **`attachDockMagnify(dock)`** — macOS-style dock icon magnification on
  mouse proximity (grows real `width`/`height`, not `transform: scale`, so
  flex layout pushes neighbors instead of overlapping).
- **`launchMenuItem(node)`** — resolves `node.appId` against `this.apps`
  and fires the same click flow as a dock icon.
- **`openMenuFolder(node, root)`** *(browser only)* — fullscreen overlay
  browsing `node.children`; items launch + close, nested groups drill into
  another level in the *same* overlay with a Back item (no overlay
  stacking). Also used for Launchpad itself, passed a synthetic
  `{ children: this.menus }` root node — see ARCHITECTURE.md §11.
- **`renderWindow(application, startupResult)`** *(browser only)* — builds
  one `.window` DOM element from a `WiseWindow.toJSON()` payload: header
  (icon/title/close/minimize/maximize), body (one child per control via
  `renderControl`), resize handle. Wires up close/minimize/maximize/drag/
  resize interactions (pure DOM, no server round trip for these).
- **`renderControl(control, appId, windowId)`** — looks up
  `WiseControlRegistry[control.type]` and calls its
  `static renderElement(control, { appId, windowId, desktop: this })`.
- **`gatherControlValues(winEl)`** — walks every `[data-control-id]` node
  under `winEl`, asks each one's registered class for
  `static gatherValue(winEl, id)`, returns `{controlId: value}` for
  whichever return non-`undefined`.
- **`async sendControlEvent(appId, controlId, sourceEl, eventName = 'click', overrideValues = {}, eventArgs = [])`**
  — the client half of the control-event round trip (ARCHITECTURE.md §5):
  gathers sibling values, POSTs `{controlId, event, values, args}` to
  `/api/applications/:appId/events`, then patches the DOM
  (`patchWindowControls`), re-applies theme/background if present in the
  response, and renders any `newWindows`.
- **`patchWindowControls(winEl, controls)`** — for each control in a fresh
  server response, calls its registered class's
  `static patchElement(winEl, control)`.

---

## `system/WiseApplication.js` — isomorphic (used server-side only in practice)

Base class every `App*.js` extends.

### Constructor

`new WiseApplication(appMetadata = {})` — reads `appID`/`appId`,
`appTitle`, `appVersion`, `appDeveloper`, `appIcon`, `appLibraries`,
`appConfig`, `appStartPoint`, `appParameter` off the metadata object (all
optional, with sane defaults). Sets `window = null`, `controls = []`,
`system = null`, `currentUser = null`.

### Methods

- **`run(appConfig = {}, appParameter = {})`** — **override this.** The
  base implementation just merges config/params and returns a status
  object; a real app creates its window here (see DEVELOPMENT_GUIDE.md §2).
  May be `async` — `WiseApplicationSystem.runApplication` always `await`s it.
- **`createWindow(WindowClass, options = {})`** — builds
  `{ appId: this.appID, appTitle, appIcon, system: this.system, currentUser: this.currentUser, ...options }`,
  constructs `new WindowClass(windowOptions)`, calls its `onWindowInit()` if
  present, stores it as `this.window`, returns it.
- **`toJSON()`** — the shape sent to the browser as `application` in
  responses: id/title/version/developer/icon/libraries/config/startPoint/
  parameter + `controls` (present only if this base class's own `controls`
  array was used directly, which real apps don't do — they use a window
  instead).

---

## `system/WiseWindow.js` — isomorphic (used server-side only in practice)

Base class every `Win*.js` extends. One instance = one on-screen window.

### Constructor

`new WiseWindow(options = {})` —

| Property set | Default | Notes |
|---|---|---|
| `windowId` | random | `window-<timestamp>-<random hex>` |
| `title` | `'Untitled Window'` | |
| `appId`, `appTitle`, `appIcon` | from options | propagated from the owning app/parent window |
| `width`, `height` | `640`, `420` | |
| `positionX`, `positionY` | `220`, `120` | |
| `visible`, `minimized`, `maximized` | `false` | |
| `params` | `null` | whatever was passed to `.show(param)` |
| `controls` | `[]` | populated by `addControl` |
| `onShow`, `onShowDialog` | `null` | optional callbacks |
| `system` | `options.system \|\| null` | the shared `WiseApplicationSystem` |
| `currentUser` | `options.currentUser \|\| null` | see ARCHITECTURE.md §8 |
| `childWindows` | `[]` | windows opened via this window's `createWindow()` |

### Methods

- **`addControl(control)`** — pushes onto `this.controls`; if
  `control.id`, sets `this[control.id] = control`; if the control has
  `getChildControls()` (a container), also registers every nested child's
  id the same way. Returns `this` (chainable).
- **`onWindowInit()`** — **override this.** Called synchronously right
  after construction (by `createWindow`). Build `this.controls = []` and
  call `addControl` for each control here. Must stay synchronous — see
  DEVELOPMENT_GUIDE.md §6/§11 for the async-data pattern.
- **`getValues()`** — walks `this.controls` (recursing into any
  `getChildControls()` containers), returns `{ [control.dataField]: control.value }`
  for every control with `isInput === true`. See ARCHITECTURE.md /
  DEVELOPMENT_GUIDE.md §4.
- **`createWindow(WindowClass, options = {})`** — same shape as
  `WiseApplication.createWindow`, but propagates `appId`/`appTitle`/
  `appIcon`/`system`/`currentUser` from *this window* (not an app), and
  pushes the new window onto `this.childWindows` instead of a single
  `this.window` slot (a window can open many child windows).
- **`show(param = null)`** — sets `visible = true, minimized = false`,
  stores `params`, calls `this.onShow(param)` if set, returns
  `{ status: 'shown', window: this.toJSON(), param }`. **Most `Win*.js`
  subclasses override this** just to also set `this.visible = true` before
  calling `super.show(param)` — check existing apps for the exact pattern.
- **`showDialog(param = null)`** — same shape, calls `onShowDialog` instead.
- **`close()` / `maximize()` / `minimize()`** — mutate the corresponding
  flag and return a status object. (In practice, minimize/maximize/close
  are handled purely client-side in `WiseDesktop.renderWindow` for
  animation reasons; these server-side methods exist for completeness/
  programmatic use but aren't wired into the default UI flow.)
- **`toJSON()`** — the payload sent to the browser: windowId, title,
  appId/appTitle/appIcon, geometry, visible/minimized/maximized, params,
  and `controls: this.controls.map(c => c.render())`.

---

## `system/controls/WiseControl.js` — isomorphic, base class for every control

### The control contract

Every control subclass follows this shape. Only override what you need —
the base class provides sane generic defaults for simple single-element
controls.

| Member | Kind | Required? | Purpose |
|---|---|---|---|
| `constructor(value, options)` | instance | yes | set `this.name` (must match the class name, used as the wire `type`), any control-specific fields, and `this.isInput = true` if it's a real input |
| `render()` | instance | yes | server → JSON sent to the browser (must include at least `type`, `id`, `value`, `visible`) |
| `static renderElement(data, context)` | static | yes | JSON → a DOM `Node`. `context = { appId, windowId, desktop }` |
| `static gatherValue(winEl, id)` | static | only if the base default (reads an `<input>/<select>/<textarea>`/contenteditable by `data-control-id`) doesn't fit | DOM → current value |
| `static patchElement(winEl, data)` | static | **required for any container control** | fresh server JSON → update DOM in place |
| `getChildControls()` | instance | only for containers | flat array of every nested control (recursive) |

### Constructor

`new WiseControl(value = '', options = {})` sets:

- `this.value = value`
- `this.name = 'WiseControl'` (subclasses override)
- `this.id = options.id || null`
- `this.dataField = options.dataField || options.id || null`
- `this.visible = options.visible !== undefined ? options.visible : true`
- `this.isInput = false` (subclasses that are real inputs set this to `true`)

### Static helpers (inherited, rarely overridden)

- **`static applyCommon(el, data)`** — sets `data-control-id`/
  `data-control-type` on `el`, applies `data.style` (numbers → `px`), hides
  `el` if `data.visible === false`. Call this from every custom
  `renderElement`.
- **`static renderElement(data)`** *(default)* — renders unknown/unhandled
  data as a `<pre>` JSON dump; doubles as the base implementation for
  simple controls that don't override it.
- **`static gatherValue(winEl, id)`** *(default)* — finds
  `[data-control-id="id"]`; if it's contenteditable returns `innerHTML`, if
  it's `INPUT`/`SELECT`/`TEXTAREA` returns `.value`, else `undefined`.
- **`static patchElement(winEl, data)`** *(default)* — same element
  resolution, writes `data.value` back the same way.

---

## Control subclasses (`system/controls/*.js`)

Each entry: constructor signature, `render()` payload fields beyond the
base (`type,id,value,visible`), and any DOM/behavior notes worth knowing.

### `WiseLabel`

`new WiseLabel(value = '', options)`. Extra method: `.text(value)` — getter
if called with no args, setter (and returns the new value) otherwise; this
is the idiomatic way handlers update a label
(`this.lblResult.text('...')`). `isInput = false`.

### `WiseTextBox`

`new WiseTextBox(placeholder = '', options)`. `render()` adds `placeholder`.
Plain `<input type="text">`. `isInput = true`.

### `WiseTextArea`

`new WiseTextArea(value = '', options)`. Options: `placeholder`, `rows`
(default 4), `onChange`. `render()` adds `placeholder, rows, hasHandler`.
`isInput = true`.

### `WiseButton`

`new WiseButton(label = '', options)`. Option: `onClick`. `render()` adds
`hasHandler`. No `gatherValue`/`patchElement` override needed (buttons
don't carry a meaningful value). `isInput = false`.

### `WiseComboBox`

`new WiseComboBox(items = [], options)` — `items: [{value, label}]`.
Option: `onChange`. Defaults `value` to the first item's value if not
given. `render()` adds `items, hasHandler`. `isInput = true`.

### `WiseRadioGroup`

`new WiseRadioGroup(items = [], options)` — same `items` shape as combo
box. **Important:** each `<input type="radio">`'s `name` attribute is
scoped as `` `${windowId}-${controlId}` `` (not just `controlId`), because
native radio inputs with the same `name` are mutually exclusive across the
*entire document*, not just within one window — without this, two open
windows of the same app would fight over each other's selection. `isInput = true`.

### `WiseCheckboxGroup`

`new WiseCheckboxGroup(items = [], options)` — `value` is an array of
selected values. `static gatherValue` returns an array (every checked
box's value); `static patchElement` checks/unchecks based on array
membership. `isInput = true`.

### `WiseDate`

`new WiseDate(value = '', options)`. Plain `<input type="date">`. Option:
`onChange`. `isInput = true`.

### `WiseDateRange`

`new WiseDateRange(value = {}, options)` — `value: {start, end}`. Renders
two date inputs (`data-range="start"|"end"`) plus a "to" separator; both
`static gatherValue`/`static patchElement` are overridden to read/write
both as one object. `isInput = true`.

### `WiseHtmlEditor`

`new WiseHtmlEditor(value = '', options)`. A `contenteditable` `<div>` with
a minimal toolbar (Bold/Italic/Underline/bullet list via
`document.execCommand`). Change event fires on `blur`, not on every
keystroke. Because the editable element itself (not a wrapper) carries
`data-control-id`, the **base class's default** `gatherValue`/
`patchElement` already handle it correctly (contenteditable →
`innerHTML`) — no override needed. `isInput = true`.

### `WiseFileUpload`

`new WiseFileUpload(label = 'Choose file', options)`. Options: `accept`
(default `'image/*'`), `onChange`. On file selection, uploads directly to
`POST /api/uploads` (raw body, PNG/JPEG/GIF/WEBP only), then calls
`sendControlEvent(..., 'change', { [data.id]: uploadResult.url })` —
**note the override value**: since the value is only known after an async
upload, `static gatherValue` intentionally returns `undefined` always (the
real value is delivered via `overrideValues`, not read back from the DOM
synchronously). `static patchElement` updates the preview thumbnail.
`isInput = true`.

### `WiseTableLayout` — container

`new WiseTableLayout(options)` — `options.rows`, `options.columns` (grid
auto-expands to fit whatever's placed via `setCell`).

- **`setCell(row, col, control, { colSpan, rowSpan } = {})`** — places (or
  replaces) a control at a zero-based `(row, col)`. Returns `this`.
- **`getChildControls()`** — every placed control (recursively, including
  controls nested inside a control that's itself a container).
- Renders as a CSS grid; `static patchElement` **is overridden** to
  delegate to each cell's own control class — required, see
  ARCHITECTURE.md §2 point 5.
- `isInput`: n/a (a container never carries its own value).

### `WiseTabControl` — container

`new WiseTabControl(options)` — `options.activeIndex` (default `0`).

- **`addTab(label, controls)`** — `controls` may be a single control or an
  array. Returns `this` (chainable).
- **`getChildControls()`** — every control in every tab (recursively).
- Tab switching is pure client-side DOM (`display` toggle) — no server
  round trip; hidden tabs' controls still gather/patch correctly since
  they remain in the DOM. `static patchElement` **is overridden** the same
  way as `WiseTableLayout`.

### `WiseDataTable` — container

See DEVELOPMENT_GUIDE.md §5 for a full usage walkthrough. Reference:

`new WiseDataTable(options)`:

| Option | Default | Meaning |
|---|---|---|
| `columns` | `[]` | see column shape below |
| `data` | `[]` | **current page only** — never the whole dataset |
| `totalCount` | `data.length` | used to compute page count |
| `pageSize` | `10` | |
| `currentPage` | `1` | |
| `pageSizeOptions` | `[10,25,50,100]` | populates the page-size `<select>` |
| `striped` | `true` | alternate row background |
| `onDataFilterChanged` | `null` | `(pageSize, currentPage) => ...` |
| `onRowSelect` | `null` | `(rowData) => ...` |

Column shape: `{ dataField, header, width, sortable (default true), type
('text'|'button'|'checkbox'|'combobox'|'radiobutton'), label (button
text), items (for combobox/radiobutton), onClick (button:
`(rowData, rowIndex)`), onChange (checkbox/combobox/radiobutton:
`(rowData, newValue, rowIndex)`) }`.

Methods:

- **`setData(rows, totalCount)`** — replaces the current page + total
  count. Call this from your `onDataFilterChanged` handler (or once up
  front for a static dataset).
- **`setColumns(columns)`**
- **`addToolbarControl(control)`** — a container-within-the-container:
  arbitrary controls rendered above the grid (search box, "Add" button,
  ...).
- **`getChildControls()`** — the toolbar controls only (cell-level
  button/checkbox/combobox/radio elements are ephemeral per-row DOM, not
  registered as window-level controls).
- **`onCellClick(rowIndex, dataField)`** / **`onCellChange(rowIndex, dataField, newValue)`**
  — internal; these are the actual top-level dispatched event handlers for
  button/checkbox/combobox/radiobutton column interactions (`this` inside
  them is the `WiseDataTable` instance, not the window — see
  ARCHITECTURE.md §5). They mutate the row in place and delegate to the
  matching column's `onClick`/`onChange`.

Client-side behavior notes: header-click sorting is **client-side only**,
sorting whatever page is currently loaded (not a full-dataset re-sort);
columns are user-resizable by dragging a handle on the header (pure
client-side, not persisted); `static patchElement` refreshes only the
`<tbody>` rows and the pagination footer, leaving the header/`<colgroup>`
(and therefore any user-resized column widths) untouched.

---

## Postgres repositories (`system/Postgres*Repository.js`)

All follow the pattern documented in ARCHITECTURE.md §12 /
DEVELOPMENT_GUIDE.md §6: env-var config, lazy `connect()` with a required
`client.on('error', ...)` handler, idempotent `ensureTable`/`ensureSchema`,
try/catch-with-fallback on read methods (except auth).

### `PostgresAppRepository`

Table `wiseape_apps`. `listApplications()` → array of
`{appID, appTitle, appVersion, appDeveloper, appIcon, appLibraries,
appConfig, appStartPoint, appParameter}`. Falls back to a small hardcoded
list (`helloWorld`, `settings`, `controls`) if the table doesn't exist or
the DB is unreachable.

### `PostgresThemeRepository`

Table `wiseape_themes`. `listThemes()` → array of
`{id, name, bg1, bg2, accent, accentDark}`. Falls back to 5 built-in
themes (`macos-light`, `light-blue`, `midnight`, `sunset`, `forest`).

### `PostgresEmployeeRepository`

Table `wiseape_employees` (`employee_id, name, department, active, level`).
Demo/reference implementation for `WiseDataTable`-backed CRUD. Seeds 23
demo rows on first use. Methods: `listEmployees({limit, offset, sortField,
sortDirection})` → `{rows, totalCount}`; `updateEmployee(id, fields)` —
partial update, only whitelisted columns (`name, department, active,
level`) are writable, returns the saved row or `null` if nothing could be
saved.

### `PostgresAuthRepository`

Tables `wiseape_users`, `wiseape_sessions`, `wiseape_app_settings`. Seeds
one admin account (`miftahul.huda@devoteam.com`) and the
`registration_requires_approval` setting (`'false'` by default) on first
use. Passwords: `crypto.scryptSync(password, salt, 64)`, salted per user,
compared with `crypto.timingSafeEqual`.

| Method | Returns |
|---|---|
| `getRegistrationRequiresApproval()` | `boolean` |
| `setRegistrationRequiresApproval(bool)` | the new value |
| `findUserByEmail(email)` | full row incl. password hash/salt (internal use — login verification) |
| `findUserById(id)` | public user shape (no password fields) or `null` |
| `createUser({name, email, password})` | public user shape; `status` is `'pending'`/`'active'` depending on the approval setting; throws `Error` with `.code === 'EMAIL_TAKEN'` on duplicate email |
| `verifyLogin(email, password)` | `{user}` or `{error: 'INVALID_CREDENTIALS' \| 'PENDING_APPROVAL'}` |
| `createSession(userId)` | `{token, expiresAt}` — 30-day TTL |
| `findValidSession(token)` | public user shape or `null` (join filtered on `expires_at > now()`) |
| `deleteSession(token)` | — (logout) |
| `updateUserPreferences(userId, {themeId, backgroundImage})` | saved public user shape or `null`; only the fields actually passed are updated |
| `listPendingUsers()` | `[{id, name, email, createdAt}]` |
| `approveUser(id)` | `{id, name, email, role, status}` or `null` |

### `PostgresMenuRepository`

Table `wiseape_menus`. Seeds a "Demos" group (HelloWorld, Controls) + a
top-level "Settings" item on first use. `listMenus()` → flat row list
`{id, parentId, type, label, icon, appId, sortOrder}` — tree-building and
icon-default resolution happen in `WiseApplicationSystem.buildMenuTree`,
not here (this repository doesn't know about the app list).

---

## Express routes (`app.js`)

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /` (catch-all) | — | serves `public/index.html` |
| static `public/*` | — | HTML/CSS/`auth.js`/`script.js`/uploaded images |
| `GET /WiseDesktop.js` | — | serves `system/WiseDesktop.js` |
| `GET /WiseApplicationSystem.js` | — | serves `system/WiseApplicationSystem.js` |
| `GET /controls/:file` | — | serves `system/controls/<file>`, regex-whitelisted `^Wise[A-Za-z]+\.js$` |
| `GET /app-assets/:appId/icon.svg` | — | serves that app's `assets/icons/icon.svg`, resolved from its `appStartPoint`; 404 if missing |
| `GET /api/system` | — | `system.getSystemSnapshot()` (legacy/mostly unused by the client) |
| `GET /api/apps` | — | app list |
| `GET /api/themes` | — | `{themes}` |
| `GET /api/menus` | — | the pre-built menu tree |
| `POST /api/auth/register` | — | `{name,email,password,confirmPassword}` → `{user, token?, message?}` |
| `POST /api/auth/login` | — | `{email,password}` → `{user, token, expiresAt}` or 401/403 |
| `GET /api/auth/session` | Bearer | validates a stored token → `{user}` (auto-login) |
| `POST /api/auth/logout` | Bearer (optional) | deletes the session |
| `GET /api/auth/settings` | — | `{requiresApproval}` |
| `PUT /api/auth/settings` | Bearer, admin | sets `{requiresApproval}` |
| `GET /api/auth/pending-users` | Bearer, admin | `{pending: [...]}` |
| `POST /api/auth/approve/:id` | Bearer, admin | approves a pending user |
| `POST /api/uploads` | — | raw image body → saves under `public/uploads/`, returns `{url}` |
| `POST /api/applications/run` | Bearer (optional) | `{appId}` → runs the app, resolving the caller's user from the token if present |
| `POST /api/applications/:appId/events` | — | `{controlId, event, values, args}` → `dispatchControlEvent` result |

`requireUser(req, res)` (a local helper in `app.js`, not exported) resolves
the Bearer token via `authRepository.findValidSession`, writing a 401
itself and returning `null` on failure — every admin-only route starts with
`const user = await requireUser(req, res); if (!user) return;`.

---

## Client bootstrap (`public/*.js`)

### `public/script.js`

Defines exactly one global: **`window.bootWiseDesktop(user, token)`** —
constructs `new WiseApplicationSystem({ root: appRoot, user, token })` and
calls `.run()`. Called once, by `auth.js`, after a successful login/
register/auto-login. Does not run on its own on page load.

### `public/auth.js`

Owns the entire login/register screen (`#auth-screen` in `index.html`) and
the auto-login check. Defines **`window.wiseapeLogout()`** (also called by
`WiseDesktop`'s top-bar Logout button) — clears the stored token, calls
`POST /api/auth/logout`, reloads the page. On script load, runs
`tryAutoLogin()`: if a token is in `localStorage` (`wiseape_token`) and
`GET /api/auth/session` accepts it, boots straight into the desktop;
otherwise shows the login form and wires up the login/register form
submit handlers (which, on success, store the token and call
`bootWiseDesktop`).
