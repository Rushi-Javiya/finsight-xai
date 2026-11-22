from functools import lru_cache

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer


@lru_cache
def _analyzer() -> SentimentIntensityAnalyzer:
    return SentimentIntensityAnalyzer()


def score_headlines(headlines: list[str]) -> float | None:
    """Mean VADER compound score in [-1, 1], or None when there is no news to score."""
    if not headlines:
        return None
    analyzer = _analyzer()
    scores = [analyzer.polarity_scores(text)["compound"] for text in headlines]
    return sum(scores) / len(scores)
