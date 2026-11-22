# FinSight frontend

Single-page dashboard for FinSight, an explainable portfolio advisor. It talks only to the backend
(`POST /api/v1/advice`, `GET /api/v1/advice/history`, `GET /api/v1/stocks/{ticker}`); see
[`docs/API.md`](../docs/API.md) for the contract.

**Stack:** Vite, React 19, TypeScript (strict), Chart.js 4 via react-chartjs-2, plain CSS with variables,
Vitest + Testing Library.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000, proxies /api to http://localhost:8080
```

| Script              | Purpose                                  |
|---------------------|------------------------------------------|
| `npm run dev`       | Vite dev server with API proxy           |
| `npm run build`     | Type-check and produce `dist/`           |
| `npm run preview`   | Serve the production build locally       |
| `npm run typecheck` | `tsc` without emitting                   |
| `npm run lint`      | ESLint (typescript-eslint, react-hooks)  |
| `npm test`          | Vitest (jsdom)                           |

## Configuration

`VITE_API_BASE_URL` (see `.env.example`) is the backend base URL. Leave it empty to call same-origin `/api`,
which the Vite dev server and the nginx image both proxy to the backend.

## Docker

```bash
docker build -t finsight-frontend .
```

The image serves the SPA with nginx (history fallback, gzip, security headers) and proxies `/api/` to
`http://backend:8080/api/`, so the compose service running the API must be named `backend`.

## Layout

```
src/
  api/         typed fetch client, ApiError (problem+json), response types
  components/  dashboard sections; components/charts holds Chart.js wrappers and theme
  hooks/       useAdvice (idle/loading/success/error with abort), useAsync
  lib/         formatters and form validation
  styles/      design tokens, base and component CSS
  test/        Vitest setup and API fixtures
```
