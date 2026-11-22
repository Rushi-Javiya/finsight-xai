import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app import __version__
from app.api import public, v1
from app.config import Settings, get_settings
from app.data.providers import MarketDataError, MarketDataProvider, SyntheticProvider, YahooProvider
from app.services.portfolio import PortfolioService, UnknownTicker
from app.services.snapshot import SnapshotService

logger = logging.getLogger("app.request")


def build_provider(settings: Settings) -> MarketDataProvider:
    if settings.market_data_provider == "synthetic":
        return SyntheticProvider()
    return YahooProvider(workers=settings.fundamentals_workers)


def create_app(provider: MarketDataProvider | None = None) -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    data_provider = provider or build_provider(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        snapshots = SnapshotService(data_provider, settings)
        app.state.portfolio_service = PortfolioService(snapshots, settings.risk_free_rate)
        app.state.provider_name = data_provider.name
        yield

    app = FastAPI(
        title="FinSight ML Service",
        description="Explainable stock scoring and portfolio construction.",
        version=__version__,
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["x-request-id"] = request_id
        logger.info(
            "%s %s -> %s in %.0fms [%s]",
            request.method, request.url.path, response.status_code, elapsed_ms, request_id,
        )
        return response

    @app.exception_handler(MarketDataError)
    async def market_data_error(_: Request, exc: MarketDataError) -> JSONResponse:
        logger.error("market data unavailable: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"title": "Market data unavailable", "status": 503, "detail": str(exc)},
        )

    @app.exception_handler(UnknownTicker)
    async def unknown_ticker(_: Request, exc: UnknownTicker) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"title": "Unknown ticker", "status": 404, "detail": f"{exc} is not covered"},
        )

    @app.exception_handler(KeyError)
    async def unsupported(_: Request, exc: KeyError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"title": "Unsupported request", "status": 422, "detail": str(exc.args[0])},
        )

    app.include_router(public)
    app.include_router(v1)
    return app


app = create_app()
