package com.finsight.web;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import com.finsight.client.MlServiceClient;
import com.finsight.client.MlServiceException;
import com.finsight.client.StockNotFoundException;
import com.finsight.dto.PortfolioRecommendation;
import com.finsight.dto.PortfolioRequest;
import com.finsight.dto.RiskLevel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    private static final String VALID_ADVICE = """
            {"income": 5000, "expenses": 3000, "age": 30, "riskLevel": "MEDIUM",
             "country": "us", "topN": 5, "investmentAmount": 10000}
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MlServiceClient mlClient;

    private PortfolioRecommendation fixture() throws IOException {
        String json = new ClassPathResource("fixtures/portfolio-response.json")
                .getContentAsString(StandardCharsets.UTF_8);
        return JsonMapper.builder().build().readValue(json, PortfolioRecommendation.class);
    }

    @Test
    void adviceReturnsCombinedResponseAndRecordsHistory() throws Exception {
        when(mlClient.recommend(any(PortfolioRequest.class))).thenReturn(fixture());

        mockMvc.perform(post("/api/v1/advice").contentType(MediaType.APPLICATION_JSON).content(VALID_ADVICE))
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Request-ID"))
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.financialHealth.status", is("HEALTHY")))
                .andExpect(jsonPath("$.financialHealth.savingsRate", is(0.4)))
                .andExpect(jsonPath("$.assetAllocation.allocations", hasSize(4)))
                .andExpect(jsonPath("$.portfolio.holdings[0].ticker", is("NVDA")))
                .andExpect(jsonPath("$.portfolio.holdings[0].factors[1].imputed", is(true)))
                .andExpect(jsonPath("$.warnings", hasSize(0)));

        mockMvc.perform(get("/api/v1/advice/history?limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tickers[0]", is("NVDA")))
                .andExpect(jsonPath("$[0].riskLevel", is("MEDIUM")))
                .andExpect(jsonPath("$[0].income").doesNotExist());
    }

    @Test
    void adviceDegradesToPartialResponseWhenMlIsDown() throws Exception {
        when(mlClient.recommend(any(PortfolioRequest.class)))
                .thenThrow(new MlServiceException("down", true, null));

        mockMvc.perform(post("/api/v1/advice").contentType(MediaType.APPLICATION_JSON).content(VALID_ADVICE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.portfolio").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.financialHealth.status", is("HEALTHY")))
                .andExpect(jsonPath("$.warnings", hasSize(1)));
    }

    @Test
    void validationErrorsAreReportedPerField() throws Exception {
        mockMvc.perform(post("/api/v1/advice").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"income": -1, "expenses": 10, "age": 12, "riskLevel": "MEDIUM", "topN": 99}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title", is("Validation failed")))
                .andExpect(jsonPath("$.errors.income", notNullValue()))
                .andExpect(jsonPath("$.errors.age", notNullValue()))
                .andExpect(jsonPath("$.errors.topN", notNullValue()));
    }

    @Test
    void malformedEnumIsABadRequestProblem() throws Exception {
        mockMvc.perform(post("/api/v1/advice").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"income": 100, "expenses": 10, "age": 30, "riskLevel": "YOLO"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)));
    }

    @Test
    void financialHealthEndpoint() throws Exception {
        mockMvc.perform(post("/api/v1/analysis/financial-health").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"income": 3000, "expenses": 3500, "age": 40, "riskLevel": "LOW"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("OVERSPENDING")));
    }

    @Test
    void assetAllocationEndpoint() throws Exception {
        mockMvc.perform(post("/api/v1/portfolio/asset-allocation").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"age": 30, "riskLevel": "MEDIUM"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allocations[0].assetClass", is("STOCKS")))
                .andExpect(jsonPath("$.allocations[0].percentage", is(36)));
    }

    @Test
    void recommendationsEndpointReturns503WhenMlIsUnavailable() throws Exception {
        when(mlClient.recommend(any(PortfolioRequest.class)))
                .thenThrow(new MlServiceException("down", true, null));

        mockMvc.perform(post("/api/v1/portfolio/recommendations").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"riskLevel\": \"LOW\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.title", is("Analytics service unavailable")));
    }

    @Test
    void stockEndpointMapsUnknownTickerTo404() throws Exception {
        when(mlClient.stockDetail(eq("NOPE"), eq(RiskLevel.MEDIUM), eq("US")))
                .thenThrow(new StockNotFoundException("NOPE"));

        mockMvc.perform(get("/api/v1/stocks/nope"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.title", is("Stock not found")));
    }

    @Test
    void stockEndpointRejectsMalformedTicker() throws Exception {
        mockMvc.perform(get("/api/v1/stocks/BAD%20TICKER!"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void actuatorHealthIsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UP")));
    }
}
