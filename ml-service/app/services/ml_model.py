import logging
from dataclasses import dataclass

import numpy as np
import pandas as pd
import xgboost as xgb

from app.config import Settings
from app.services.features import ML_FEATURES, long_format, technical_panel

logger = logging.getLogger(__name__)

MIN_TRAIN_ROWS = 300
MIN_VALIDATION_DATES = 8


@dataclass
class MLResult:
    predictions: pd.Series
    contributions: pd.DataFrame
    feature_values: pd.DataFrame
    trained_samples: int
    validation_rank_ic: float | None
    horizon_days: int

    @property
    def usable(self) -> bool:
        # Quality gate: the model only influences rankings if it beat chance on held-out data.
        return self.validation_rank_ic is not None and self.validation_rank_ic > 0


XGB_PARAMS = {
    "objective": "reg:squarederror",
    "max_depth": 3,
    "eta": 0.05,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "lambda": 5.0,
    "tree_method": "hist",
    "nthread": 1,
    "seed": 42,
}
BOOST_ROUNDS = 200


def _fit(features: pd.DataFrame, target: pd.Series) -> xgb.Booster:
    return xgb.train(XGB_PARAMS, xgb.DMatrix(features, label=target), num_boost_round=BOOST_ROUNDS)


def _build_training_set(
    prices: pd.DataFrame, horizon: int, stride: int, min_history: int
) -> tuple[pd.DataFrame, pd.Series] | None:
    panel = technical_panel(prices)
    forward = prices.shift(-horizon) / prices - 1
    relative = forward.sub(forward.mean(axis=1), axis=0)

    positions = range(min_history, len(prices) - horizon, stride)
    if len(positions) < MIN_VALIDATION_DATES * 2:
        return None
    dates = prices.index[list(positions)]

    features = long_format(panel, dates)
    target = (
        relative.loc[dates].rename_axis("date").reset_index()
        .melt(id_vars="date", var_name="ticker", value_name="target")
        .set_index(["date", "ticker"])["target"]
    )
    data = features.join(target).dropna(subset=["target"])
    if len(data) < MIN_TRAIN_ROWS:
        return None
    return data[ML_FEATURES], data["target"]


def _mean_rank_ic(predicted: pd.Series, actual: pd.Series) -> float | None:
    scores = []
    frame = pd.DataFrame({"p": predicted, "a": actual})
    for _, group in frame.groupby(level="date"):
        if len(group) >= 5 and group["p"].nunique() > 1:
            value = group["p"].corr(group["a"], method="spearman")
            if np.isfinite(value):
                scores.append(value)
    return float(np.mean(scores)) if len(scores) >= MIN_VALIDATION_DATES else None


def train_and_predict(prices: pd.DataFrame, settings: Settings) -> MLResult | None:
    """Fit a gradient-boosted ranker of 21-day relative returns and explain it with SHAP.

    Returns None when history is too short to train anything meaningful, in which case the
    ML factor is treated as neutral downstream.
    """
    horizon = settings.ml_forward_horizon_days
    training = _build_training_set(
        prices, horizon, settings.ml_sample_stride_days, settings.ml_min_history_days
    )
    if training is None:
        logger.warning("not enough history to train the ML model")
        return None
    features, target = training

    dates = features.index.get_level_values("date").unique().sort_values()
    split = int(len(dates) * 0.75)
    purge = max(1, horizon // settings.ml_sample_stride_days)
    train_dates, valid_dates = dates[:split], dates[split + purge :]

    validation_ic = None
    if len(valid_dates) >= MIN_VALIDATION_DATES:
        in_train = features.index.get_level_values("date").isin(train_dates)
        in_valid = features.index.get_level_values("date").isin(valid_dates)
        probe = _fit(features[in_train], target[in_train])
        predicted = pd.Series(
            probe.predict(xgb.DMatrix(features[in_valid])), index=features.index[in_valid]
        )
        validation_ic = _mean_rank_ic(predicted, target[in_valid])

    model = _fit(features, target)

    panel = technical_panel(prices)
    latest = pd.DataFrame({name: frame.iloc[-1] for name, frame in panel.items()})[ML_FEATURES]
    latest = latest.dropna(how="all")
    matrix = xgb.DMatrix(latest, feature_names=ML_FEATURES)
    contribs = model.predict(matrix, pred_contribs=True)

    return MLResult(
        predictions=pd.Series(model.predict(matrix), index=latest.index),
        contributions=pd.DataFrame(contribs[:, :-1], index=latest.index, columns=ML_FEATURES),
        feature_values=latest,
        trained_samples=len(features),
        validation_rank_ic=validation_ic,
        horizon_days=horizon,
    )
