import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Protocol

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class MarketDataError(RuntimeError):
    """Raised when market data cannot be retrieved in a usable form."""


@dataclass
class Fundamentals:
    name: str | None = None
    sector: str | None = None
    trailing_pe: float | None = None
    earnings_growth: float | None = None
    revenue_growth: float | None = None
    profit_margin: float | None = None
    return_on_equity: float | None = None
    headlines: list[str] = field(default_factory=list)


class MarketDataProvider(Protocol):
    name: str

    def prices(self, tickers: list[str], days: int) -> pd.DataFrame:
        """Adjusted close prices, indexed by date, one column per ticker."""

    def fundamentals(self, tickers: list[str]) -> dict[str, Fundamentals]:
        """Fundamentals and recent news headlines per ticker (best effort)."""


def _finite(value: object) -> float | None:
    return float(value) if isinstance(value, int | float) and np.isfinite(value) else None


def _headline_titles(news: object, limit: int = 15) -> list[str]:
    titles: list[str] = []
    if not isinstance(news, list):
        return titles
    for item in news[:limit]:
        if not isinstance(item, dict):
            continue
        content = item.get("content")
        title = content.get("title") if isinstance(content, dict) else item.get("title")
        if isinstance(title, str) and title.strip():
            titles.append(title.strip())
    return titles


class YahooProvider:
    name = "yahoo"

    def __init__(self, workers: int = 8) -> None:
        self._workers = workers

    def prices(self, tickers: list[str], days: int) -> pd.DataFrame:
        import yfinance as yf

        try:
            raw = yf.download(
                tickers,
                period=f"{max(days, 30)}d",
                auto_adjust=True,
                progress=False,
                threads=True,
            )
        except Exception as exc:
            raise MarketDataError(f"Price download failed: {exc}") from exc

        if raw is None or raw.empty:
            raise MarketDataError("Price download returned no data")

        close = raw.get("Close", raw)
        if isinstance(close, pd.Series):
            close = close.to_frame(name=tickers[0])
        close = close.dropna(axis=1, how="all").sort_index()
        if close.empty:
            raise MarketDataError("No usable price series in download")
        return close

    def fundamentals(self, tickers: list[str]) -> dict[str, Fundamentals]:
        import yfinance as yf

        def fetch(ticker: str) -> tuple[str, Fundamentals]:
            result = Fundamentals()
            try:
                handle = yf.Ticker(ticker)
                info = handle.info or {}
                result.name = info.get("longName") or info.get("shortName")
                result.sector = info.get("sector")
                pe = _finite(info.get("trailingPE"))
                result.trailing_pe = pe if pe and pe > 0 else None
                result.earnings_growth = _finite(info.get("earningsGrowth"))
                result.revenue_growth = _finite(info.get("revenueGrowth"))
                result.profit_margin = _finite(info.get("profitMargins"))
                result.return_on_equity = _finite(info.get("returnOnEquity"))
            except Exception as exc:
                logger.warning("fundamentals unavailable for %s: %s", ticker, exc)
            try:
                result.headlines = _headline_titles(yf.Ticker(ticker).news)
            except Exception as exc:
                logger.debug("news unavailable for %s: %s", ticker, exc)
            return ticker, result

        with ThreadPoolExecutor(max_workers=self._workers) as pool:
            return dict(pool.map(fetch, tickers))


_SYNTHETIC_SECTORS = ["Technology", "Financial Services", "Healthcare", "Consumer Defensive",
                      "Communication Services", "Industrials", "Energy"]
_POSITIVE_HEADLINES = ["Company beats earnings expectations", "Analysts raise price target"]
_NEGATIVE_HEADLINES = ["Regulators open probe into company", "Shares slump on weak guidance"]


class SyntheticProvider:
    """Deterministic offline provider for tests, CI and demos without internet access."""

    name = "synthetic"

    @staticmethod
    def _rng(ticker: str) -> np.random.Generator:
        seed = int(hashlib.sha256(ticker.encode()).hexdigest()[:8], 16)
        return np.random.default_rng(seed)

    def prices(self, tickers: list[str], days: int) -> pd.DataFrame:
        index = pd.bdate_range(end=pd.Timestamp("2026-01-30"), periods=max(days * 5 // 7, 260))
        columns = {}
        for ticker in tickers:
            rng = self._rng(ticker)
            drift = rng.uniform(-0.05, 0.30) / 252
            vol = rng.uniform(0.15, 0.55) / np.sqrt(252)
            shocks = rng.normal(drift, vol, len(index))
            columns[ticker] = 100 * rng.uniform(0.5, 4) * np.exp(np.cumsum(shocks))
        return pd.DataFrame(columns, index=index)

    def fundamentals(self, tickers: list[str]) -> dict[str, Fundamentals]:
        result = {}
        for ticker in tickers:
            rng = self._rng(ticker + "-f")
            sentiment_pool = _POSITIVE_HEADLINES if rng.random() > 0.5 else _NEGATIVE_HEADLINES
            result[ticker] = Fundamentals(
                name=f"{ticker} Synthetic Corp",
                sector=_SYNTHETIC_SECTORS[int(rng.integers(len(_SYNTHETIC_SECTORS)))],
                trailing_pe=float(rng.uniform(8, 45)) if rng.random() > 0.1 else None,
                earnings_growth=float(rng.uniform(-0.3, 0.6)),
                revenue_growth=float(rng.uniform(-0.1, 0.4)),
                profit_margin=float(rng.uniform(0.02, 0.35)),
                return_on_equity=float(rng.uniform(0.02, 0.5)),
                headlines=list(sentiment_pool),
            )
        return result
