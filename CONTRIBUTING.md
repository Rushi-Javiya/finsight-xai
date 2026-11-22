# Contributing

## Workflow

1. Branch from `main` (`feat/...`, `fix/...`).
2. Keep changes focused; add or update tests alongside the code.
3. Run the checks for every service you touched (below). CI runs the same commands.
4. Open a pull request using the template.

Use [Conventional Commits](https://www.conventionalcommits.org/) for messages
(`feat(ml): ...`, `fix(backend): ...`, `docs: ...`).

## Checks

```bash
# ml-service
cd ml-service && pip install -r requirements-dev.txt && ruff check . && pytest

# backend (Java 21)
cd backend && ./mvnw verify

# frontend (Node 22)
cd frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build
```

## Conventions

* **API contract first.** Any change to a request/response shape is made in `docs/API.md`, the
  backend DTOs and the frontend types together.
* **Explainability is a feature, not decoration.** A factor that influences a ranking must appear
  in `factors[]` with its exact contribution. Don't add hidden adjustments to scores.
* **No personal financial data at rest.** The history table stores recommendations only.
* **Tests use the synthetic market-data provider** so they are deterministic and offline.
