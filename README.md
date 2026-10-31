# HTML2IMG

A self-hosted HTML-to-image converter built with SvelteKit, Playwright and SQLite.

- Create named **export configs** (browser viewport, scale factor, full-page, image format, etc.)
- Render HTML to **PNG, JPEG or WebP** through the UI or a simple HTTP API
- Login with email/password (the first user is promoted to admin)
- Local SQLite database
- API keys for programmatic export (e.g. from n8n)
- Ships as a single Docker container

A default **`email`** export config is seeded for everyone. It renders at 600px wide, full
height, `@2x`, PNG — suitable for Gmail and most email clients.

## Requirements

- Node.js 22+ and pnpm (for local development)
- Docker (for container deployment)

## Local development

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173, sign up, and start exporting.

## Environment variables

Copy `.env.example` to `.env` and adjust as needed.

| Variable                  | Default              | Description                                           |
| ------------------------- | -------------------- | ----------------------------------------------------- |
| `DATABASE_PATH`           | `./data/html2img.db` | SQLite database file                                  |
| `APP_SECRET`              | _(generated)_        | Auth secret; auto-generated next to the DB when unset |
| `ENABLE_SIGNUP`           | `true`               | Allow new account sign-up                             |
| `ENABLE_PASSWORD_LOGIN`   | `true`               | Allow email/password login                            |
| `AUTO_PROMOTE_FIRST_USER` | `true`               | Promote the first registered user to admin            |
| `PORT`                    | `3000`               | HTTP port                                             |
| `HOST`                    | `0.0.0.0`            | Bind address                                          |
| `ORIGIN`                  | _(unset)_            | Public origin, used by auth when behind a proxy       |
| `EXPORT_CONCURRENCY`      | `2`                  | Max concurrent browser renders                        |
| `EXPORT_MAX_TIMEOUT_MS`   | `10000`              | Hard cap for a single export (10 seconds)             |

## Docker

```bash
docker compose up --build
```

The image installs Chromium (with system dependencies) and runs the app as a non-root user.
The SQLite database lives in the `/data` volume.

Pre-built images are published to **ghcr.io** on every push to `main` and on version tags:

```bash
docker pull ghcr.io/kellojo/html2img:latest
docker pull ghcr.io/kellojo/html2img:1.0.0
```

## HTTP API

### `POST /api/v1/export`

Authenticate with an API key created in the UI:

```
Authorization: Bearer h2i_...
```

JSON body:

```json
{
	"html": "<html><body><h1>Hello</h1></body></html>",
	"config": "email"
}
```

- `config` references an export config by name. Your own config takes precedence over a
  system/default template with the same name.
- All export config fields can be overridden inline, e.g. `"width": 1200`, `"height": 630`,
  `"fullPage": false`, `"format": "jpeg"`, `"quality": 85`, `"deviceScaleFactor": 1`,
  `"omitBackground": true`, `"css": "body { ... }"`, `"waitUntil": "networkidle"`,
  `"waitForNetworkIdle": true`, `"timeoutMs": 10000`.

On success the response is the raw image bytes with the appropriate `Content-Type`
(`image/png`, `image/jpeg` or `image/webp`) and an `X-Export-Id` header.

Example with curl:

```bash
curl -X POST http://localhost:3000/api/v1/export \
  -H "Authorization: Bearer h2i_..." \
  -H "Content-Type: application/json" \
  -d '{"html":"<b>Hello from n8n</b>","config":"email"}' \
  -o export.png
```

### Other endpoints (session-authenticated, used by the UI)

| Method   | Path                              | Description                               |
| -------- | --------------------------------- | ----------------------------------------- |
| `GET`    | `/api/health`                     | Health check                              |
| `GET`    | `/api/export-configs`             | List own + system configs                 |
| `POST`   | `/api/export-configs`             | Create a config                           |
| `GET`    | `/api/export-configs/:id`         | Get one config                            |
| `PATCH`  | `/api/export-configs/:id`         | Update an owned config                    |
| `DELETE` | `/api/export-configs/:id`         | Delete an owned config                    |
| `POST`   | `/api/export-configs/:id/preview` | Render HTML to an image (no history)      |
| `POST`   | `/api/export-configs/:id/export`  | Render HTML and record the export         |
| `GET`    | `/api/exports`                    | List recent exports                       |
| `GET`    | `/api/api-keys`                   | List API keys                             |
| `POST`   | `/api/api-keys`                   | Create an API key (raw key returned once) |
| `DELETE` | `/api/api-keys/:id`               | Delete an API key                         |

## Export config model

| Field                | Type                                          | Notes                                       |
| -------------------- | --------------------------------------------- | ------------------------------------------- |
| `name`               | string                                        | Unique per user, used by the HTTP API       |
| `width`              | number                                        | Browser viewport width (100–8000)           |
| `height`             | number \| null                                | Viewport height; required unless `fullPage` |
| `deviceScaleFactor`  | number                                        | Output pixel density (0.5–4)                |
| `fullPage`           | boolean                                       | Capture full scroll height                  |
| `format`             | `png` \| `jpeg` \| `webp`                     | Output format                               |
| `quality`            | number \| null                                | JPEG/WebP quality (1–100)                   |
| `omitBackground`     | boolean                                       | Transparent background (PNG/WebP)           |
| `css`                | string \| null                                | Extra CSS injected before capture           |
| `waitUntil`          | `load` \| `domcontentloaded` \| `networkidle` | Load wait strategy                          |
| `waitForNetworkIdle` | boolean                                       | Wait for network idle                       |
| `timeoutMs`          | number                                        | Per-export timeout (max 10000)              |

Browsers are launched per export and closed immediately afterwards to keep memory usage
bounded.

## Tests

```bash
# unit + integration tests (vitest)
pnpm test:unit

# end-to-end tests (playwright; requires Chromium)
pnpm exec playwright install chromium
pnpm test:e2e

# everything
pnpm test
```

The renderer integration tests need a Playwright Chromium browser installed locally:

```bash
pnpm exec playwright install chromium
```

## Project layout

```
migrations/           SQLite migrations (app tables + better-auth)
src/lib/server/       config, db repos, auth, renderer, export service
src/lib/types.ts      shared TypeScript types
src/routes/           SvelteKit pages and API routes
e2e/                  Playwright end-to-end tests
```
