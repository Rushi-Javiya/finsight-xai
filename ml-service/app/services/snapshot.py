import logging
import threading
from dataclasses import dataclass
from datetime import UTC, datetime

import pandas as pd
from cachetools import TTLCache

from app.config import Settings
from app.data.providers import Fundamentals, MarketDataError, MarketDataProvider
from app.data.universe import Universe, get_universe
from app.services.features import clean_prices, compute_features
from app.services.ml_model import MLResult, train_and_predict
from app.services.scoring import FactorFrames, build_raw_factors, standardise

logger = logging.getLogger(__name__)

MIN_UNIVERSE_SIZE = 5


@dataclass
class Snapshot:
    as_of: datetime
    universe: Universe
    provider: str
    prices: pd.DataFrame
    features: pd.DataFrame
    fundamentals: dict[str, Fundamentals]
    ml: MLResult | None
    frames: FactorFrames

    @property
    def ml_active(self) -> bool:
        return self.ml is not None and self.ml.usable


class SnapshotService:
    """Builds and caches everything derived from market data for a universe."""

    def __init__(self, provider: MarketDataProvider, settings: Settings) -> None:
        self._provider = provider
        self._settings = settings
        self._cache: TTLCache[str, Snapshot] = TTLCache(
            maxsize=8, ttl=settings.snapshot_ttl_seconds
        )
        self._lock = threading.Lock()

    @property
    def provider_name(self) -> str:
        return self._provider.name

    def get(self, country: str) -> Snapshot:
        universe = get_universe(country)
        with self._lock:
            cached = self._cache.get(universe.country)
            if cached is not None:
                return cached
            snapshot = self._build(universe)
            self._cache[universe.country] = snapshot
            return snapshot

    def _build(self, universe: Universe) -> Snapshot:
        logger.info("building snapshot for %s via %s", universe.country, self._provider.name)
        prices = clean_prices(
            self._provider.prices(list(universe.tickers), self._settings.history_period_days)
        )
        if prices.shape[1] < MIN_UNIVERSE_SIZE:
            raise MarketDataError(
                f"Only {prices.shape[1]} tickers have enough history; need {MIN_UNIVERSE_SIZE}"
            )

        features = compute_features(prices)
        prices = prices[features.index]
        fundamentals = self._provider.fundamentals(list(features.index))
        ml = train_and_predict(prices, self._settings)
        frames = standardise(build_raw_factors(features, fundamentals, ml))

        as_of = prices.index[-1]
        as_of = (as_of.to_pydatetime() if hasattr(as_of, "to_pydatetime") else datetime.now(UTC))
        return Snapshot(
            as_of=as_of.replace(tzinfo=UTC),
            universe=universe,
            provider=self._provider.name,
            prices=prices,
            features=features,
            fundamentals=fundamentals,
            ml=ml,
            frames=frames,
        )
