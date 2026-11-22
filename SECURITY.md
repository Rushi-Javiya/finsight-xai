# Security policy

Please report vulnerabilities privately through GitHub's
["Report a vulnerability"](../../security/advisories/new) feature rather than a public issue.

## Design notes

* The ML service is internal-only. It is not published by `docker-compose.yml` and requires the
  `X-API-Key` header whenever `ML_API_KEY` is set. Change the default key before deploying.
* The backend validates all input, returns RFC 7807 problem documents without stack traces, and
  restricts CORS to configured origins.
* Request and response bodies containing financial figures are not logged or persisted.
* Disable the interactive API docs in production with `API_DOCS_ENABLED=false`.
