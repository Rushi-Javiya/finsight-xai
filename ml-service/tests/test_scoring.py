import numpy as np
import pandas as pd
import pytest

from app.schemas import RiskLevel
from app.services.scoring import (
    FACTOR_WEIGHTS,
    FACTORS,
    contributions,
    effective_weights,
    standardise,
)


@pytest.mark.parametrize("risk", list(RiskLevel))
def test_weights_sum_to_one(risk):
    assert sum(FACTOR_WEIGHTS[risk].values()) == pytest.approx(1.0)
    assert set(FACTOR_WEIGHTS[risk]) == set(FACTORS)


def test_standardise_flags_missing_and_neutralises():
    raw = pd.DataFrame(
        {f: [1.0, 2.0, 3.0, 4.0] for f in FACTORS}, index=["A", "B", "C", "D"]
    )
    raw.loc["B", "value"] = np.nan
    frames = standardise(raw)
    assert frames.imputed.loc["B", "value"]
    assert frames.z.loc["B", "value"] == 0.0
    assert frames.z.abs().max().max() <= 3.0


def test_constant_factor_has_no_influence():
    raw = pd.DataFrame({f: [1.0, 1.0, 1.0] for f in FACTORS}, index=["A", "B", "C"])
    frames = standardise(raw)
    assert (frames.z == 0).all().all()


def test_contributions_are_additive(snapshot):
    contrib = contributions(snapshot.frames, RiskLevel.MEDIUM, snapshot.ml_active)
    weights = effective_weights(RiskLevel.MEDIUM, snapshot.ml_active)
    expected = (snapshot.frames.z * weights).sum(axis=1)
    pd.testing.assert_series_equal(contrib.sum(axis=1), expected)


@pytest.mark.parametrize("risk", list(RiskLevel))
def test_gated_ml_is_removed_and_weights_renormalised(risk):
    weights = effective_weights(risk, ml_active=False)
    assert weights["ml_signal"] == 0.0
    assert weights.sum() == pytest.approx(1.0)
    assert effective_weights(risk, ml_active=True).sum() == pytest.approx(1.0)


def test_risk_profiles_rank_differently(snapshot):
    low = contributions(snapshot.frames, RiskLevel.LOW).sum(axis=1).sort_values().index
    high = contributions(snapshot.frames, RiskLevel.HIGH).sum(axis=1).sort_values().index
    assert list(low) != list(high)
