# API reference

The browser only talks to the **backend** (`/api/v1/*`, port 8080). The backend talks to the
**ML service** (`/v1/*`, port 8000), which is internal and never exposed publicly.
Interactive OpenAPI docs: `http://localhost:8080/swagger-ui.html`.

All JSON is `camelCase`. Percentages and rates are **fractions** (`0.153` = 15.3%), except
asset-allocation `percentage`, which is an integer 0-100.

## Errors

Every error is an RFC 7807 problem document:

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "detail": "Request validation failed",
  "errors": { "income": "must be greater than 0" }
}
```

`errors` is present only for validation failures (HTTP 400). Upstream ML failures never fail the
combined advice endpoint; they surface as `warnings` (see below). The single-purpose
`/portfolio/recommendations` and `/stocks/{ticker}` endpoints return 502/503 problems instead.

## `POST /api/v1/advice`

One call that powers the dashboard: financial health + asset allocation + explained stock portfolio.

Request:

```json
{
  "income": 5000,
  "expenses": 3000,
  "age": 30,
  "riskLevel": "MEDIUM",
  "country": "US",
  "topN": 8,
  "investmentAmount": 10000
}
```

| Field | Rules |
|---|---|
| `income` | required, > 0, monthly |
| `expenses` | required, >= 0, monthly |
| `age` | required, 18-100 |
| `riskLevel` | required, `LOW` \| `MEDIUM` \| `HIGH` |
| `country` | optional, `US` (default) or `IN` |
| `topN` | optional, 3-15, default 8 |
| `investmentAmount` | optional, > 0, in the market's currency |

Response:

```json
{
  "id": 12,
  "createdAt": "2026-11-22T10:15:30Z",
  "financialHealth": {
    "savings": 2000.0,
    "savingsRate": 0.4,
    "status": "HEALTHY",
    "message": "Good financial health",
    "recommendedMonthlySavings": 1000.0,
    "emergencyFundTarget": 18000.0
  },
  "assetAllocation": {
    "riskLevel": "MEDIUM",
    "age": 30,
    "allocations": [
      { "assetClass": "STOCKS", "percentage": 36 },
      { "assetClass": "ETFS", "percentage": 44 },
      { "assetClass": "BONDS", "percentage": 15 },
      { "assetClass": "CASH", "percentage": 5 }
    ],
    "explanation": "..."
  },
  "portfolio": { "...see PortfolioRecommendation..." },
  "warnings": []
}
```

* `financialHealth.status`: `OVERSPENDING` \| `LOW_SAVINGS` \| `HEALTHY`.
* `portfolio` is `null` and `warnings` contains a message when the ML service is unreachable.
* `assetClass` is one of `STOCKS`, `ETFS`, `BONDS`, `CASH`.

## `POST /api/v1/analysis/financial-health`
Body: `income`, `expenses`, `age`, `riskLevel`. Returns the `financialHealth` object above.

## `POST /api/v1/portfolio/asset-allocation`
Body: `age`, `riskLevel`. Returns the `assetAllocation` object above.

## `POST /api/v1/portfolio/recommendations`
Body: `riskLevel`, `country`, `topN`, `investmentAmount` (same rules as above).
Returns a `PortfolioRecommendation`.

## `GET /api/v1/stocks/{ticker}?riskLevel=MEDIUM&country=US`
Returns a `StockDetail` (one stock, same explanation structure, plus six months of prices).

## `GET /api/v1/advice/history?limit=20`
Most recent advice requests (newest first). No income or other personal figures are stored.

```json
[
  {
    "id": 12,
    "createdAt": "2026-11-22T10:15:30Z",
    "riskLevel": "MEDIUM",
    "country": "US",
    "tickers": ["NVDA", "META", "JPM"],
    "expectedAnnualReturn": 0.0513,
    "annualVolatility": 0.1601
  }
]
```

## `PortfolioRecommendation`

```json
{
  "asOf": "2026-11-20T00:00:00Z",
  "riskLevel": "MEDIUM",
  "country": "US",
  "currency": "USD",
  "dataSource": "yahoo",
  "universeSize": 20,
  "holdings": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "sector": "Technology",
      "rank": 1,
      "score": 0.7483,
      "weight": 0.22,
      "allocationAmount": 2200.0,
      "price": 180.12,
      "annualReturn": 0.31,
      "volatility": 0.4118,
      "maxDrawdown": -0.2,
      "factors": [
        {
          "factor": "growth",
          "label": "Growth",
          "rawValue": 1.0,
          "displayValue": "100.0%",
          "percentile": 100.0,
          "zScore": 2.6,
          "weight": 0.15,
          "contribution": 0.39,
          "imputed": false
        }
      ],
      "mlDrivers": [
        { "feature": "mom_126", "label": "6-month momentum", "value": -0.4157, "contribution": 0.0528 }
      ],
      "explanation": "NVIDIA Corporation ranks #1 of 20 for a medium-risk profile ...",
      "dataQualityNotes": []
    }
  ],
  "metrics": {
    "expectedAnnualReturn": 0.0513,
    "annualVolatility": 0.1601,
    "sharpeRatio": 0.071,
    "maxDrawdown": -0.1413,
    "diversificationRatio": 1.837,
    "effectiveHoldings": 7.11,
    "riskFreeRate": 0.04
  },
  "sectorExposure": { "Financial Services": 0.41, "Technology": 0.22 },
  "model": {
    "name": "XGBoost relative-return ranker",
    "trainedSamples": 2160,
    "validationRankIc": -0.094,
    "active": false,
    "horizonDays": 21,
    "features": ["1-month momentum", "..."]
  },
  "factorWeights": {
    "momentum": 0.2, "low_volatility": 0.15, "value": 0.15, "growth": 0.15,
    "quality": 0.1, "sentiment": 0.05, "ml_signal": 0.2
  },
  "methodology": "...",
  "disclaimer": "..."
}
```

Key semantics:

* `holdings` are sorted by `rank` ascending; `weight` values sum to 1.
* `factors` are sorted by absolute `contribution`. For a holding, **`score` = sum of
  `contribution`** and `contribution = weight * zScore`, so the explanation is exact and additive.
* `factors[].imputed = true` means the input was missing and treated as neutral (z = 0).
* `percentile` is 0-100 (higher is better for every factor), or `null`.
* `model.active = false` means the ML quality gate excluded the ML factor (its weight is 0).
  `mlDrivers` are SHAP values explaining the model's prediction; they are informational when
  the model is inactive.
* `model` may be `null` when there was not enough history to train.
* `maxDrawdown` is negative.

## `StockDetail`

Same fields as a holding (`ticker`, `name`, `sector`, `rank`, `score`, `price`, `annualReturn`,
`volatility`, `maxDrawdown`, `factors`, `mlDrivers`, `explanation`, `dataQualityNotes`) without
`weight`/`allocationAmount`, plus `asOf`, `riskLevel`, `country`, `currency`, `dataSource`,
`universeSize`, `disclaimer` and `priceHistory: [{ "date": "2026-11-20", "close": 180.12 }]`.

## ML service (internal)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness, unauthenticated |
| GET | `/v1/universes` | supported markets and tickers |
| POST | `/v1/portfolio/recommend` | body as `/api/v1/portfolio/recommendations` |
| GET | `/v1/stocks/{ticker}` | `riskLevel`, `country` query parameters |

When `ML_API_KEY` is set, `/v1/*` requires the `X-API-Key` header.
