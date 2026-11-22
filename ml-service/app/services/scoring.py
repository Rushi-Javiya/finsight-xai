from dataclasses import dataclass

import numpy as np
import pandas as pd

from app.data.providers import Fundamentals
from app.schemas import RiskLevel
from app.services.ml_model import MLResult
from app.services.sentiment import score_headlines

FACTORS = ["momentum", "low_volatility", "value", "growth", "quality", "sentiment", "ml_signal"]

FACTOR_LABELS = {
    "momentum": "Momentum",
    "low_volatility": "Low volatility",
    "value": "Value",
    "growth": "Growth",
    "quality": "Quality",
    "sentiment": "News sentiment",
    "ml_signal": "ML outlook",
}

# Weights sum to 1 for each profile; a positive weight rewards a high standardised factor.
FACTOR_WEIGHTS: dict[RiskLevel, dict[str, float]] = {
    RiskLevel.LOW: {
        "momentum": 0.05, "low_volatility": 0.35, "value": 0.15, "growth": 0.05,
        "quality": 0.25, "sentiment": 0.05, "ml_signal": 0.10,
    },
    RiskLevel.MEDIUM: {
        "momentum": 0.20, "low_volatility": 0.15, "value": 0.15, "growth": 0.15,
        "quality": 0.10, "sentiment": 0.05, "ml_signal": 0.20,
    },
    RiskLevel.HIGH: {
        "momentum": 0.30, "low_volatility": 0.05, "value": 0.05, "growth": 0.25,
        "quality": 0.05, "sentiment": 0.10, "ml_signal": 0.20,
    },
}

Z_CLIP = 3.0


@dataclass
class FactorFrames:
    raw: pd.DataFrame
    z: pd.DataFrame
    imputed: pd.DataFrame


def _mean_of_available(values: list[float | None], low: float, high: float) -> float:
    usable = [min(max(v, low), high) for v in values if v is not None and np.isfinite(v)]
    return float(np.mean(usable)) if usable else np.nan


def build_raw_factors(
    features: pd.DataFrame,
    fundamentals: dict[str, Fundamentals],
    ml: MLResult | None,
) -> pd.DataFrame:
    rows = {}
    for ticker in features.index:
        info = fundamentals.get(ticker) or Fundamentals()
        row = features.loc[ticker]
        sentiment = score_headlines(info.headlines)
        pe = info.trailing_pe
        rows[ticker] = {
            "momentum": 0.5 * row["mom_3m"] + 0.5 * row["mom_6m"],
            "low_volatility": -row["volatility"],
            "value": 1.0 / pe if pe and pe > 0 else np.nan,
            "growth": _mean_of_available([info.earnings_growth, info.revenue_growth], -1.0, 1.0),
            "quality": _mean_of_available([info.profit_margin, info.return_on_equity], -0.5, 1.0),
            "sentiment": sentiment if sentiment is not None else np.nan,
            "ml_signal": (
                float(ml.predictions[ticker])
                if ml is not None and ticker in ml.predictions.index
                else np.nan
            ),
        }
    return pd.DataFrame.from_dict(rows, orient="index")[FACTORS]


def standardise(raw: pd.DataFrame) -> FactorFrames:
    """Cross-sectional z-scores, winsorised; missing inputs become neutral (0) and are flagged."""
    imputed = raw.isna()
    mean = raw.mean()
    std = raw.std(ddof=0).replace(0, np.nan)
    z = ((raw - mean) / std).clip(-Z_CLIP, Z_CLIP).fillna(0.0)
    return FactorFrames(raw=raw, z=z, imputed=imputed)


def effective_weights(risk: RiskLevel, ml_active: bool) -> pd.Series:
    """Profile weights, with the ML factor removed and the rest renormalised if it is gated off."""
    weights = pd.Series(FACTOR_WEIGHTS[risk])[FACTORS]
    if not ml_active:
        weights["ml_signal"] = 0.0
        weights = weights / weights.sum()
    return weights


def contributions(frames: FactorFrames, risk: RiskLevel, ml_active: bool = True) -> pd.DataFrame:
    return frames.z.mul(effective_weights(risk, ml_active), axis=1)


def natural_value(factor: str, raw: float) -> float | None:
    """Convert the internal factor value to the quantity a human would recognise."""
    if raw is None or not np.isfinite(raw):
        return None
    if factor == "low_volatility":
        return -raw
    if factor == "value":
        return 1.0 / raw if raw > 0 else None
    return float(raw)


def format_value(factor: str, natural: float | None) -> str:
    if natural is None:
        return "n/a"
    if factor == "value":
        return f"P/E {natural:.1f}"
    if factor == "sentiment":
        return f"{natural:+.2f}"
    if factor in ("momentum", "ml_signal"):
        return f"{natural:+.1%}"
    return f"{natural:.1%}"
