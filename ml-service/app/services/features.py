import numpy as np
import pandas as pd

TRADING_DAYS = 252
MIN_HISTORY_DAYS = 130

ML_FEATURES = [
    "mom_21", "mom_63", "mom_126", "vol_21", "vol_63", "drawdown_63", "rsi_14", "dist_high_252",
]

ML_FEATURE_LABELS = {
    "mom_21": "1-month momentum",
    "mom_63": "3-month momentum",
    "mom_126": "6-month momentum",
    "vol_21": "1-month volatility",
    "vol_63": "3-month volatility",
    "drawdown_63": "3-month drawdown",
    "rsi_14": "RSI (14d)",
    "dist_high_252": "Distance from 52w high",
}


def max_drawdown(series: pd.Series) -> float:
    running_peak = series.cummax()
    return float((series / running_peak - 1).min())


def clean_prices(prices: pd.DataFrame) -> pd.DataFrame:
    """Drop tickers with too little history and forward-fill gaps from holidays."""
    prices = prices.ffill(limit=5)
    enough = prices.count() >= MIN_HISTORY_DAYS
    prices = prices.loc[:, enough]
    return prices.dropna(how="all")


def compute_features(prices: pd.DataFrame) -> pd.DataFrame:
    """Point-in-time risk/return statistics per ticker (index = ticker)."""
    returns = prices.pct_change(fill_method=None)
    last_year = returns.tail(TRADING_DAYS)
    price_last_year = prices.tail(TRADING_DAYS + 1)

    def period_return(days: int) -> pd.Series:
        valid = prices.ffill()
        return valid.iloc[-1] / valid.iloc[-(days + 1)] - 1

    frame = pd.DataFrame(
        {
            "price": prices.ffill().iloc[-1],
            "mom_3m": period_return(63),
            "mom_6m": period_return(126),
            "annual_return": last_year.mean() * TRADING_DAYS,
            "volatility": last_year.std() * np.sqrt(TRADING_DAYS),
            "max_drawdown": price_last_year.apply(
                lambda col: max_drawdown(col.dropna()) if col.notna().any() else np.nan
            ),
        }
    )
    frame["volatility"] = frame["volatility"].clip(lower=1e-4)
    return frame.dropna(subset=["price", "mom_3m", "mom_6m", "volatility"])


def _rsi(prices: pd.DataFrame, window: int = 14) -> pd.DataFrame:
    delta = prices.diff()
    gain = delta.clip(lower=0).rolling(window).mean()
    loss = (-delta.clip(upper=0)).rolling(window).mean()
    return 100 - 100 / (1 + gain / loss.replace(0, np.nan))


def technical_panel(prices: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """Date x ticker frames for every ML feature, computed strictly from past data."""
    prices = prices.ffill(limit=5)
    returns = prices.pct_change(fill_method=None)
    annualise = np.sqrt(TRADING_DAYS)
    return {
        "mom_21": prices.pct_change(21, fill_method=None),
        "mom_63": prices.pct_change(63, fill_method=None),
        "mom_126": prices.pct_change(126, fill_method=None),
        "vol_21": returns.rolling(21).std() * annualise,
        "vol_63": returns.rolling(63).std() * annualise,
        "drawdown_63": prices / prices.rolling(63).max() - 1,
        "rsi_14": _rsi(prices),
        "dist_high_252": prices / prices.rolling(252, min_periods=126).max() - 1,
    }


def long_format(panel: dict[str, pd.DataFrame], dates: pd.Index) -> pd.DataFrame:
    """Reshape the panel into rows of (date, ticker, features...)."""
    parts = []
    for name, frame in panel.items():
        melted = frame.loc[dates].rename_axis("date").reset_index().melt(
            id_vars="date", var_name="ticker", value_name=name
        )
        parts.append(melted.set_index(["date", "ticker"])[name])
    return pd.concat(parts, axis=1)
