# Running Wiseape Application System (WAS)

WAS now runs as **two separate processes**:

| Process | Location | Port | Role |
|---|---|---|---|
| **Server** (REST API) | `server/applications/WiseapeApplicationSystem/` | `4000` | Postgres access, business logic, control-event dispatch. No UI. |
| **Client** (frontend) | `client/` | `3000` | Static desktop UI. Talks to the server over HTTP/CORS. |

They are independent Node/Express apps with their own `package.json`, `.env`, and `node_modules` — install and run each separately. Start the **server first** (the client will still boot with the server down, but every desktop icon/app fetch will fail until it's up).

## Prerequisites

- Node.js 18+ (uses `node --env-file=.env`, no `dotenv` package needed)
- Network access to the PostgreSQL database used by `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`

## 1. Run the server (REST API)

```bash
cd server/applications/WiseapeApplicationSystem
npm install
```

Create `.env` (copy `.env.example` and fill in real values):

```bash
cp .env.example .env
```

```
DB_HOST=your-postgres-host
DB_NAME=wiseape-application-system
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_PORT=5432
PORT=4000
```

Start it:

```bash
npm run dev     # node --watch --env-file=.env app.js -- restarts on file changes
# or
npm start       # node --env-file=.env app.js -- no auto-restart
```

You should see:

```
Wiseape Application System REST API running on http://localhost:4000
```

Verify it's actually answering:

```bash
curl http://localhost:4000/api/apps
curl http://localhost:4000/api/menus
```

## 2. Run the client (frontend)

In a **second terminal**:

```bash
cd client
npm install
```

Create `.env` (copy `.env.example` and adjust if needed):

```bash
cp .env.example .env
```

```
PORT=3000
API_BASE_URL=http://localhost:4000
```

`API_BASE_URL` must point at wherever the server from step 1 is actually reachable (same value it printed on startup). Start it:

```bash
npm run dev     # node --watch --env-file=.env app.js
# or
npm start
```

You should see:

```
Wiseape Application System client running on http://localhost:3000
Talking to REST API at http://localhost:4000
```

Open **http://localhost:3000** in a browser, register/log in, and use the desktop as normal.

## How the two talk to each other

- The client injects `window.WISEAPE_API_BASE_URL` (from `API_BASE_URL`) via `GET /config.js`, loaded as the very first `<script>` in `public/index.html`.
- Every browser-side `fetch(...)` to `/api/...` or `/app-assets/...` goes through `window.wiseapeApiUrl(path)`, which prefixes that base URL.
- The server has CORS enabled (`cors()` with defaults) so cross-origin requests from the client's origin are allowed.
- Login/session/control-event calls send `Authorization: Bearer <token>` — the server re-validates the token on every request (it does not cache who you are between requests).

## Running both on one machine, quickly

```bash
# terminal 1
cd server/applications/WiseapeApplicationSystem && npm run dev

# terminal 2
cd client && npm run dev
```

## Troubleshooting

- **"Could not reach the server" on the login screen** — the server isn't running, or `API_BASE_URL` in `client/.env` doesn't match the port/host the server is actually listening on. Restart the client after changing `.env` (env vars are only read at process start).
- **Port already in use** — another `node --env-file=.env app.js` from a previous session is still running. Find and stop it: `pkill -f "node --env-file=.env app.js"`, or change `PORT` in the relevant `.env`.
- **CORS error in the browser console** — confirm you're hitting the server's real port in `API_BASE_URL`; the server allows all origins by default, so this usually means the URL itself is wrong (typo, wrong port, `http` vs `https`).
- **Desktop loads but every app icon 404s / "Application X not found"** — that app isn't implemented in `server/applications/WiseapeApplicationSystem/src/services/apps/registry.js`. Only `helloWorld`, `controls`, and `settings` are wired up; other rows in the `wiseape_apps` table are just data and don't automatically work.
- **Database connection errors on server start** — double check `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_PORT` in `server/applications/WiseapeApplicationSystem/.env`; the server needs direct network access to that Postgres instance.
