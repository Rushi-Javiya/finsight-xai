from dataclasses import dataclass


@dataclass(frozen=True)
class Universe:
    country: str
    name: str
    currency: str
    tickers: tuple[str, ...]


UNIVERSES: dict[str, Universe] = {
    "US": Universe(
        country="US",
        name="US large-cap",
        currency="USD",
        tickers=(
            "AAPL", "MSFT", "GOOGL", "AMZN", "META",
            "TSLA", "NVDA", "AMD", "NFLX", "INTC",
            "JPM", "V", "MA", "DIS", "PEP",
            "KO", "PFE", "MRK", "CSCO", "ORCL",
        ),
    ),
    "IN": Universe(
        country="IN",
        name="India NSE large-cap",
        currency="INR",
        tickers=(
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "SUNPHARMA.NS",
            "TITAN.NS", "WIPRO.NS", "NESTLEIND.NS", "ULTRACEMCO.NS", "BAJFINANCE.NS",
        ),
    ),
}


def get_universe(country: str) -> Universe:
    try:
        return UNIVERSES[country.upper()]
    except KeyError as exc:
        raise KeyError(f"Unsupported country '{country}'") from exc
