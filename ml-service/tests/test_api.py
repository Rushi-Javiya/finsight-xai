from app.config import Settings, get_settings


def test_health(client):
    body = client.get("/health").json()
    assert body == {"status": "UP", "version": "1.0.0", "dataProvider": "synthetic"}


def test_universes(client):
    countries = {u["country"] for u in client.get("/v1/universes").json()}
    assert countries == {"US", "IN"}


def test_recommend_uses_camel_case(client):
    response = client.post(
        "/v1/portfolio/recommend",
        json={"riskLevel": "HIGH", "country": "US", "topN": 5},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["riskLevel"] == "HIGH"
    assert len(body["holdings"]) == 5
    assert {"expectedAnnualReturn", "sharpeRatio"} <= set(body["metrics"])
    assert body["holdings"][0]["factors"][0]["contribution"] is not None


def test_recommend_rejects_invalid_input(client):
    assert client.post("/v1/portfolio/recommend", json={"riskLevel": "YOLO"}).status_code == 422
    assert client.post("/v1/portfolio/recommend", json={"topN": 99}).status_code == 422
    unsupported = client.post("/v1/portfolio/recommend", json={"country": "ZZ"})
    assert unsupported.status_code == 422


def test_stock_detail(client):
    body = client.get("/v1/stocks/aapl", params={"riskLevel": "LOW"}).json()
    assert body["ticker"] == "AAPL"
    assert 1 <= body["rank"] <= body["universeSize"]
    assert len(body["priceHistory"]) == 126


def test_unknown_ticker_is_404(client):
    assert client.get("/v1/stocks/NOPE").status_code == 404


def test_api_key_enforced_when_configured(client):
    client.app.dependency_overrides[get_settings] = lambda: Settings(api_key="secret")
    try:
        assert client.get("/v1/universes").status_code == 401
        assert client.get("/v1/universes", headers={"X-API-Key": "nope"}).status_code == 401
        assert client.get("/v1/universes", headers={"X-API-Key": "secret"}).status_code == 200
        assert client.get("/health").status_code == 200
    finally:
        client.app.dependency_overrides.clear()
