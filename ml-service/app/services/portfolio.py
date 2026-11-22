import numpy as np
import pandas as pd

from app.schemas import (
    FactorContribution,
    Holding,
    MlDriver,
    ModelInfo,
    PortfolioMetrics,
    PortfolioRequest,
    PortfolioResponse,
    PricePoint,
    RiskLevel,
    StockDetail,
)
from app.services.features import ML_FEATURE_LABELS, TRADING_DAYS
from app.services.scoring import (
    FACTOR_LABELS,
    FACTORS,
    contributions,
    effective_weights,
    format_value,
    natural_value,
)
from app.services.snapshot import Snapshot, SnapshotService

DISCLAIMER = (
    "For educational and informational purposes only. This is not investment advice. "
    "Historical statistics do not predict future results."
)

METHODOLOGY = (
    "Every stock in the universe is scored on seven standardised factors (momentum, low "
    "volatility, value, growth, quality, news sentiment and a gradient-boosted ML outlook). "
    "The score is the weighted sum of z-scores, with weights set by the risk profile, so each "
    "factor's contribution to the final ranking is exact and additive. The ML outlook is "
    "itself explained with SHAP values and is only used when it beats chance on held-out data. "
    "The top-ranked stocks are weighted by score, tilted "
    "towards lower volatility for conservative profiles, and capped per position."
)

# (max position size, softmax temperature, inverse-volatility tilt exponent)
CONSTRUCTION = {
    RiskLevel.LOW: (0.18, 1.0, 1.0),
    RiskLevel.MEDIUM: (0.22, 0.75, 0.5),
    RiskLevel.HIGH: (0.30, 0.50, 0.0),
}

SIGNIFICANT = 0.02


class UnknownTicker(KeyError):
    pass


def cap_weights(weights: pd.Series, cap: float) -> pd.Series:
    weights = weights / weights.sum()
    for _ in range(100):
        over = weights > cap + 1e-12
        if not over.any():
            break
        excess = (weights[over] - cap).sum()
        weights[over] = cap
        room = weights < cap - 1e-12
        if not room.any():
            break
        weights[room] += excess * weights[room] / weights[room].sum()
    return weights / weights.sum()


def construct_weights(
    scores: pd.Series, volatility: pd.Series, risk: RiskLevel, size: int
) -> pd.Series:
    cap, temperature, tilt = CONSTRUCTION[risk]
    spread = scores.std(ddof=0) or 1.0
    standardised = (scores - scores.mean()) / spread
    raw = np.exp(standardised / temperature) * volatility.reindex(scores.index) ** -tilt
    weights = cap_weights(raw.astype(float), max(cap, 1.0 / size + 0.01))
    rounded = weights.round(4)
    rounded.loc[rounded.idxmax()] += 1.0 - rounded.sum()
    return rounded.round(4)


def compute_metrics(snapshot: Snapshot, weights: pd.Series, risk_free: float) -> PortfolioMetrics:
    returns = snapshot.prices[weights.index].pct_change(fill_method=None).tail(TRADING_DAYS)
    returns = returns.fillna(0.0)
    portfolio = returns @ weights
    annual_return = float(portfolio.mean() * TRADING_DAYS)
    annual_vol = float(portfolio.std() * np.sqrt(TRADING_DAYS))
    cumulative = (1 + portfolio).cumprod()
    drawdown = float((cumulative / cumulative.cummax() - 1).min())
    weighted_vol = float((returns.std() * np.sqrt(TRADING_DAYS) * weights).sum())
    return PortfolioMetrics(
        expected_annual_return=round(annual_return, 4),
        annual_volatility=round(annual_vol, 4),
        sharpe_ratio=round((annual_return - risk_free) / annual_vol, 3) if annual_vol else 0.0,
        max_drawdown=round(drawdown, 4),
        diversification_ratio=round(weighted_vol / annual_vol, 3) if annual_vol else 1.0,
        effective_holdings=round(float(1.0 / (weights**2).sum()), 2),
        risk_free_rate=risk_free,
    )


def _percentile_phrase(percentile: float | None) -> str:
    if percentile is None:
        return "no peer comparison"
    if percentile >= 50:
        return f"ahead of {percentile:.0f}% of peers"
    return f"behind {100 - percentile:.0f}% of peers"


def _factor_entries(
    snapshot: Snapshot, ticker: str, risk: RiskLevel, contribution_row: pd.Series
) -> list[FactorContribution]:
    frames = snapshot.frames
    weights = effective_weights(risk, snapshot.ml_active)
    percentiles = frames.raw.rank(pct=True) * 100
    entries = []
    for factor in FACTORS:
        raw = frames.raw.at[ticker, factor]
        natural = natural_value(factor, raw)
        percentile = percentiles.at[ticker, factor]
        entries.append(
            FactorContribution(
                factor=factor,
                label=FACTOR_LABELS[factor],
                raw_value=None if natural is None else round(natural, 4),
                display_value=format_value(factor, natural),
                percentile=None if pd.isna(percentile) else round(float(percentile), 1),
                z_score=round(float(frames.z.at[ticker, factor]), 3),
                weight=round(float(weights[factor]), 4),
                contribution=round(float(contribution_row[factor]), 4),
                imputed=bool(frames.imputed.at[ticker, factor]),
            )
        )
    return sorted(entries, key=lambda e: abs(e.contribution), reverse=True)


def _ml_drivers(snapshot: Snapshot, ticker: str, limit: int = 5) -> list[MlDriver]:
    ml = snapshot.ml
    if ml is None or ticker not in ml.contributions.index:
        return []
    shap = ml.contributions.loc[ticker]
    values = ml.feature_values.loc[ticker]
    drivers = [
        MlDriver(
            feature=name,
            label=ML_FEATURE_LABELS[name],
            value=None if pd.isna(values[name]) else round(float(values[name]), 4),
            contribution=round(float(shap[name]), 5),
        )
        for name in shap.index
    ]
    return sorted(drivers, key=lambda d: abs(d.contribution), reverse=True)[:limit]


def _quality_notes(snapshot: Snapshot, entries: list[FactorContribution]) -> list[str]:
    notes = [f"{e.label} unavailable; treated as neutral." for e in entries if e.imputed]
    ml = snapshot.ml
    if ml is None:
        notes.append("ML outlook could not be trained on the available history.")
    elif not ml.usable:
        ic = "unavailable" if ml.validation_rank_ic is None else f"{ml.validation_rank_ic:+.2f}"
        notes.append(
            f"ML outlook excluded from the score: out-of-sample rank IC is {ic}, "
            "so the model did not demonstrate predictive value."
        )
    return notes


def _describe(entry: FactorContribution) -> str:
    return (
        f"{entry.label} ({entry.display_value}, {_percentile_phrase(entry.percentile)}, "
        f"{entry.contribution:+.2f})"
    )


def _explanation(
    name: str, rank: int, size: int, score: float, risk: RiskLevel,
    entries: list[FactorContribution],
) -> str:
    helpful = [e for e in entries if e.contribution > SIGNIFICANT and not e.imputed][:3]
    drags = [e for e in entries if e.contribution < -SIGNIFICANT and not e.imputed][:2]
    parts = [
        f"{name} ranks #{rank} of {size} for a {risk.value.lower()}-risk profile "
        f"(score {score:+.2f})."
    ]
    if helpful:
        parts.append("Tailwinds: " + "; ".join(_describe(e) for e in helpful) + ".")
    else:
        parts.append("No factor stands out as a strong positive driver.")
    if drags:
        parts.append("Headwinds: " + "; ".join(_describe(e) for e in drags) + ".")
    return " ".join(parts)


class PortfolioService:
    def __init__(self, snapshots: SnapshotService, risk_free_rate: float) -> None:
        self._snapshots = snapshots
        self._risk_free = risk_free_rate

    def _ranked(self, snapshot: Snapshot, risk: RiskLevel) -> tuple[pd.DataFrame, pd.Series]:
        contrib = contributions(snapshot.frames, risk, snapshot.ml_active)
        scores = contrib.sum(axis=1).sort_values(ascending=False)
        return contrib, scores

    def _display_name(self, snapshot: Snapshot, ticker: str) -> tuple[str, str]:
        info = snapshot.fundamentals.get(ticker)
        return (
            (info.name if info and info.name else ticker),
            (info.sector if info and info.sector else "Unknown"),
        )

    def recommend(self, request: PortfolioRequest) -> PortfolioResponse:
        snapshot = self._snapshots.get(request.country)
        risk = request.risk_level
        contrib, scores = self._ranked(snapshot, risk)
        size = min(request.top_n, len(scores))
        chosen = scores.head(size)
        weights = construct_weights(chosen, snapshot.features["volatility"], risk, size)
        rank_of = {ticker: position + 1 for position, ticker in enumerate(scores.index)}

        holdings = []
        sector_exposure: dict[str, float] = {}
        for ticker in chosen.index:
            name, sector = self._display_name(snapshot, ticker)
            entries = _factor_entries(snapshot, ticker, risk, contrib.loc[ticker])
            stats = snapshot.features.loc[ticker]
            weight = float(weights[ticker])
            sector_exposure[sector] = round(sector_exposure.get(sector, 0.0) + weight, 4)
            holdings.append(
                Holding(
                    ticker=ticker,
                    name=name,
                    sector=sector,
                    rank=rank_of[ticker],
                    score=round(float(chosen[ticker]), 4),
                    weight=weight,
                    allocation_amount=(
                        round(weight * request.investment_amount, 2)
                        if request.investment_amount
                        else None
                    ),
                    price=round(float(stats["price"]), 2),
                    annual_return=round(float(stats["annual_return"]), 4),
                    volatility=round(float(stats["volatility"]), 4),
                    max_drawdown=round(float(stats["max_drawdown"]), 4),
                    factors=entries,
                    ml_drivers=_ml_drivers(snapshot, ticker),
                    explanation=_explanation(name, rank_of[ticker], len(scores),
                                             float(chosen[ticker]), risk, entries),
                    data_quality_notes=_quality_notes(snapshot, entries),
                )
            )

        ml = snapshot.ml
        return PortfolioResponse(
            as_of=snapshot.as_of,
            risk_level=risk,
            country=snapshot.universe.country,
            currency=snapshot.universe.currency,
            data_source=snapshot.provider,
            universe_size=len(scores),
            holdings=holdings,
            metrics=compute_metrics(snapshot, weights, self._risk_free),
            sector_exposure=dict(sorted(sector_exposure.items(), key=lambda kv: -kv[1])),
            model=None if ml is None else ModelInfo(
                name="XGBoost relative-return ranker",
                trained_samples=ml.trained_samples,
                validation_rank_ic=(
                    None if ml.validation_rank_ic is None else round(ml.validation_rank_ic, 3)
                ),
                active=ml.usable,
                horizon_days=ml.horizon_days,
                features=list(ML_FEATURE_LABELS.values()),
            ),
            factor_weights={
                k: round(float(v), 4)
                for k, v in effective_weights(risk, snapshot.ml_active).items()
            },
            methodology=METHODOLOGY,
            disclaimer=DISCLAIMER,
        )

    def stock_detail(self, ticker: str, risk: RiskLevel, country: str) -> StockDetail:
        snapshot = self._snapshots.get(country)
        ticker = ticker.upper()
        if ticker not in snapshot.features.index:
            raise UnknownTicker(ticker)

        contrib, scores = self._ranked(snapshot, risk)
        rank = int(list(scores.index).index(ticker)) + 1
        name, sector = self._display_name(snapshot, ticker)
        entries = _factor_entries(snapshot, ticker, risk, contrib.loc[ticker])
        stats = snapshot.features.loc[ticker]
        history = snapshot.prices[ticker].dropna().tail(126)

        return StockDetail(
            as_of=snapshot.as_of,
            risk_level=risk,
            country=snapshot.universe.country,
            currency=snapshot.universe.currency,
            data_source=snapshot.provider,
            universe_size=len(scores),
            ticker=ticker,
            name=name,
            sector=sector,
            rank=rank,
            score=round(float(scores[ticker]), 4),
            price=round(float(stats["price"]), 2),
            annual_return=round(float(stats["annual_return"]), 4),
            volatility=round(float(stats["volatility"]), 4),
            max_drawdown=round(float(stats["max_drawdown"]), 4),
            factors=entries,
            ml_drivers=_ml_drivers(snapshot, ticker),
            explanation=_explanation(name, rank, len(scores), float(scores[ticker]), risk, entries),
            data_quality_notes=_quality_notes(snapshot, entries),
            price_history=[
                PricePoint(date=idx.strftime("%Y-%m-%d"), close=round(float(v), 4))
                for idx, v in history.items()
            ],
            disclaimer=DISCLAIMER,
        )
