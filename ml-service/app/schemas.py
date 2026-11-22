from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class PortfolioRequest(CamelModel):
    risk_level: RiskLevel = RiskLevel.MEDIUM
    country: str = Field(default="US", min_length=2, max_length=2)
    top_n: int = Field(default=8, ge=3, le=15)
    investment_amount: float | None = Field(default=None, gt=0)


class FactorContribution(CamelModel):
    factor: str
    label: str
    raw_value: float | None
    display_value: str
    percentile: float | None = Field(description="Position within the universe, 0-100.")
    z_score: float
    weight: float
    contribution: float
    imputed: bool = Field(description="True when the input was missing and treated as neutral.")


class MlDriver(CamelModel):
    feature: str
    label: str
    value: float | None
    contribution: float = Field(description="SHAP contribution to the predicted relative return.")


class Holding(CamelModel):
    ticker: str
    name: str
    sector: str
    rank: int
    score: float
    weight: float
    allocation_amount: float | None = None
    price: float
    annual_return: float
    volatility: float
    max_drawdown: float
    factors: list[FactorContribution]
    ml_drivers: list[MlDriver]
    explanation: str
    data_quality_notes: list[str]


class PortfolioMetrics(CamelModel):
    expected_annual_return: float
    annual_volatility: float
    sharpe_ratio: float
    max_drawdown: float
    diversification_ratio: float
    effective_holdings: float
    risk_free_rate: float


class ModelInfo(CamelModel):
    name: str
    trained_samples: int
    validation_rank_ic: float | None
    active: bool = Field(description="False when the quality gate excluded the model from scoring.")
    horizon_days: int
    features: list[str]


class PortfolioResponse(CamelModel):
    as_of: datetime
    risk_level: RiskLevel
    country: str
    currency: str
    data_source: str
    universe_size: int
    holdings: list[Holding]
    metrics: PortfolioMetrics
    sector_exposure: dict[str, float]
    model: ModelInfo | None
    factor_weights: dict[str, float]
    methodology: str
    disclaimer: str


class PricePoint(CamelModel):
    date: str
    close: float


class StockDetail(CamelModel):
    as_of: datetime
    risk_level: RiskLevel
    country: str
    currency: str
    data_source: str
    universe_size: int
    ticker: str
    name: str
    sector: str
    rank: int
    score: float
    price: float
    annual_return: float
    volatility: float
    max_drawdown: float
    factors: list[FactorContribution]
    ml_drivers: list[MlDriver]
    explanation: str
    data_quality_notes: list[str]
    price_history: list[PricePoint]
    disclaimer: str


class UniverseInfo(CamelModel):
    country: str
    name: str
    currency: str
    tickers: list[str]


class HealthResponse(CamelModel):
    status: str
    version: str
    data_provider: str
