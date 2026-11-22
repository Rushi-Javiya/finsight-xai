import pandas as pd
import pytest

from app.schemas import PortfolioRequest, RiskLevel
from app.services.portfolio import cap_weights, construct_weights


def test_cap_weights_respects_cap_and_sums_to_one():
    capped = cap_weights(pd.Series({"A": 10.0, "B": 1.0, "C": 1.0, "D": 1.0}), 0.4)
    assert capped.sum() == pytest.approx(1.0)
    assert capped.max() <= 0.4 + 1e-9


def _scores(snapshot) -> pd.Series:
    tickers = list(snapshot.features.index[:8])
    return pd.Series(range(8, 0, -1), index=tickers, dtype=float)


@pytest.mark.parametrize("risk", list(RiskLevel))
def test_construct_weights_sum_exactly_to_one(snapshot, risk):
    scores = _scores(snapshot)
    weights = construct_weights(scores, snapshot.features["volatility"], risk, 8)
    assert round(weights.sum(), 4) == 1.0
    assert (weights > 0).all()


def test_conservative_profile_is_more_diversified_than_aggressive(snapshot):
    scores = _scores(snapshot)
    low = construct_weights(scores, snapshot.features["volatility"], RiskLevel.LOW, 8)
    high = construct_weights(scores, snapshot.features["volatility"], RiskLevel.HIGH, 8)
    assert low.max() < high.max()


def test_recommend_returns_explained_holdings(client):
    service = client.app.state.portfolio_service
    response = service.recommend(
        PortfolioRequest(risk_level=RiskLevel.MEDIUM, top_n=6, investment_amount=10_000)
    )
    assert len(response.holdings) == 6
    assert sum(h.weight for h in response.holdings) == pytest.approx(1.0, abs=1e-6)
    assert sum(h.allocation_amount for h in response.holdings) == pytest.approx(10_000, abs=1)
    top = response.holdings[0]
    assert top.name in top.explanation
    assert len(top.factors) == 7
    assert top.ml_drivers
    assert sum(response.sector_exposure.values()) == pytest.approx(1.0, abs=1e-3)
    assert response.metrics.annual_volatility > 0
    assert [h.score for h in response.holdings] == sorted(
        (h.score for h in response.holdings), reverse=True
    )
