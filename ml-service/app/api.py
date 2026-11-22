import hmac
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from app import __version__
from app.config import Settings, get_settings
from app.data.universe import UNIVERSES
from app.schemas import (
    HealthResponse,
    PortfolioRequest,
    PortfolioResponse,
    RiskLevel,
    StockDetail,
    UniverseInfo,
)
from app.services.portfolio import PortfolioService


def require_api_key(
    settings: Annotated[Settings, Depends(get_settings)],
    x_api_key: Annotated[str | None, Header()] = None,
) -> None:
    if settings.api_key and not hmac.compare_digest(x_api_key or "", settings.api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def get_portfolio_service(request: Request) -> PortfolioService:
    return request.app.state.portfolio_service


PortfolioDep = Annotated[PortfolioService, Depends(get_portfolio_service)]

public = APIRouter()
v1 = APIRouter(prefix="/v1", dependencies=[Depends(require_api_key)])


@public.get("/health", response_model=HealthResponse, tags=["ops"])
def health(request: Request) -> HealthResponse:
    return HealthResponse(
        status="UP",
        version=__version__,
        data_provider=request.app.state.provider_name,
    )


@v1.get("/universes", response_model=list[UniverseInfo], tags=["market"])
def universes() -> list[UniverseInfo]:
    return [
        UniverseInfo(country=u.country, name=u.name, currency=u.currency, tickers=list(u.tickers))
        for u in UNIVERSES.values()
    ]


@v1.post("/portfolio/recommend", response_model=PortfolioResponse, tags=["portfolio"])
def recommend(body: PortfolioRequest, service: PortfolioDep) -> PortfolioResponse:
    return service.recommend(body)


@v1.get("/stocks/{ticker}", response_model=StockDetail, tags=["market"])
def stock_detail(
    ticker: str,
    service: PortfolioDep,
    risk_level: Annotated[RiskLevel, Query(alias="riskLevel")] = RiskLevel.MEDIUM,
    country: Annotated[str, Query(min_length=2, max_length=2)] = "US",
) -> StockDetail:
    return service.stock_detail(ticker, risk_level, country)
