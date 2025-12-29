# AI Pulp UI

> Note: Everything in this repository was generated using VS Code and the models GPT-5.2 and Sonnet 4.5.

React + TypeScript frontend for managing Pulp resources (RPM, File, DEB) via the Pulp REST API.

The UI talks to the backend at `http://localhost:8080/pulp/api/v3/` (by default) and runs locally on `http://localhost:3000`.

You can override the backend with the `PULP_BACKEND` environment variable (default: `http://localhost:8080`).

## Requirements

- Node.js 18+ and npm
- Docker or Podman (only if you use `./tests/run_container.sh`)
- A running Pulp backend on `http://localhost:8080`
  - Option A (recommended for tests): use `./tests/run_container.sh ...` to start an ephemeral Pulp container for the duration of a command
  - Option B: run your own Pulp instance locally and use `npm run dev`

## Quickstart

Install dependencies:

```bash
npm install
```

Run the UI with an ephemeral Pulp backend (starts Pulp, then runs Vite):

```bash
./tests/run_container.sh npm run dev -- --host 0.0.0.0
```

Use a custom backend:

```bash
PULP_BACKEND=http://my-pulp-host:8080 npm run dev
```

Open:

- UI: `http://localhost:3000`
- Pulp API: `http://localhost:8080/pulp/api/v3/`

## API & Proxy

- By default, the frontend uses a relative API base of `/pulp/api/v3` (see [src/services/api.ts](src/services/api.ts)).
- In dev, Vite proxies `/pulp/*` to `http://localhost:8080` by default, or to `PULP_BACKEND` if set (see [vite.config.ts](vite.config.ts)).

## Authentication

- The login form validates credentials against `GET /pulp/api/v3/groups/`.
- Credentials are used as HTTP Basic auth and stored as a base64 token in `localStorage` under `authToken`.

## Build

```bash
npm run build
```

Preview the production build (static server only):

```bash
npm run preview
```

If you want the preview build to talk to a live Pulp backend, serve it behind a reverse proxy that forwards `/pulp/*` to `http://localhost:8080` (the Vite dev proxy only applies to `npm run dev`).

Alternatively, you can build with `PULP_BACKEND` set to make the UI call the backend by absolute URL (note: this may require CORS to be enabled on the backend):

```bash
PULP_BACKEND=http://my-pulp-host:8080 npm run build
```

## Tests

Unit/integration tests (Vitest):

```bash
npm test
```

E2E tests (Playwright) against an ephemeral Pulp backend:

```bash
./tests/run_container.sh npm run test:e2e
```

Open the Playwright HTML report:

```bash
npx playwright show-report
```

Notes:

- Playwright tracing is enabled for all E2E tests via [playwright.config.ts](playwright.config.ts).
- For more E2E details, see [e2e/README.md](e2e/README.md).

## Repo Layout

- `src/` React UI (components, services, contexts)
- `e2e/` Playwright tests
- `tests/run_container.sh` helper to start an ephemeral Pulp container and run a command with that backend available

## Pulp Docs

- Pulp user docs: https://pulpproject.org/user/
- REST APIs:
  - RPM: https://pulpproject.org/pulp_rpm/restapi/
  - File: https://pulpproject.org/pulp_file/restapi/
  - DEB: https://pulpproject.org/pulp_deb/restapi/
