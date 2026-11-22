import numpy as np
import pandas as pd

from app.services.features import ML_FEATURES
from app.services.ml_model import train_and_predict


def test_model_trains_and_explains(snapshot, settings):
    result = snapshot.ml
    assert result is not None
    assert result.trained_samples > 300
    assert list(result.contributions.columns) == ML_FEATURES
    assert set(result.predictions.index) == set(snapshot.features.index)
    assert np.isfinite(result.predictions).all()


def test_training_is_deterministic(snapshot, settings):
    again = train_and_predict(snapshot.prices, settings)
    pd.testing.assert_series_equal(again.predictions, snapshot.ml.predictions)


def test_returns_none_for_short_history(snapshot, settings):
    assert train_and_predict(snapshot.prices.tail(150), settings) is None
