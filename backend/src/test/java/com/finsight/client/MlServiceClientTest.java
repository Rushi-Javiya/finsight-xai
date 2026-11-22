package com.finsight.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withResourceNotFound;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import com.finsight.dto.PortfolioRecommendation;
import com.finsight.dto.PortfolioRequest;
import com.finsight.dto.RiskLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class MlServiceClientTest {

    private MockRestServiceServer server;
    private MlServiceClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml.test");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new MlServiceClient(builder.build(), 2);
    }

    private static String fixture() throws IOException {
        return new ClassPathResource("fixtures/portfolio-response.json")
                .getContentAsString(StandardCharsets.UTF_8);
    }

    @Test
    void deserialisesPortfolioAndIgnoresUnknownFields() throws IOException {
        server.expect(requestTo("http://ml.test/v1/portfolio/recommend"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().json("{\"riskLevel\":\"MEDIUM\",\"country\":\"US\",\"topN\":8}"))
                .andRespond(withSuccess(fixture(), MediaType.APPLICATION_JSON));

        PortfolioRecommendation result = client.recommend(
                new PortfolioRequest(RiskLevel.MEDIUM, null, null, new BigDecimal("10000")));

        assertThat(result.holdings()).hasSize(2);
        assertThat(result.holdings().get(0).factors().get(1).imputed()).isTrue();
        assertThat(result.holdings().get(0).factors().get(1).rawValue()).isNull();
        assertThat(result.model().active()).isFalse();
        assertThat(result.metrics().sharpeRatio()).isEqualTo(0.071);
        server.verify();
    }

    @Test
    void mapsUnknownTickerTo404Exception() {
        server.expect(requestTo("http://ml.test/v1/stocks/NOPE?riskLevel=LOW&country=US"))
                .andRespond(withResourceNotFound());

        assertThatThrownBy(() -> client.stockDetail("NOPE", RiskLevel.LOW, "US"))
                .isInstanceOf(StockNotFoundException.class);
    }

    @Test
    void mapsServiceUnavailable() {
        server.expect(requestTo("http://ml.test/v1/portfolio/recommend"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.recommend(new PortfolioRequest(RiskLevel.LOW, "US", 5, null)))
                .isInstanceOfSatisfying(MlServiceException.class, e -> assertThat(e.isUnavailable()).isTrue());
    }

    @Test
    void mapsServerErrorAsBadGatewayNotUnavailable() {
        server.expect(requestTo("http://ml.test/v1/portfolio/recommend")).andRespond(withServerError());

        assertThatThrownBy(() -> client.recommend(new PortfolioRequest(RiskLevel.LOW, "US", 5, null)))
                .isInstanceOfSatisfying(MlServiceException.class, e -> assertThat(e.isUnavailable()).isFalse());
    }
}
