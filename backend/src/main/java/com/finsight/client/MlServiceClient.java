package com.finsight.client;

import java.net.ConnectException;
import java.net.http.HttpClient;
import java.util.function.Supplier;

import com.finsight.config.MlServiceProperties;
import com.finsight.config.RequestIdFilter;
import com.finsight.dto.PortfolioRecommendation;
import com.finsight.dto.PortfolioRequest;
import com.finsight.dto.RiskLevel;
import com.finsight.dto.StockDetail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Typed access to the internal ML service: timeouts, retry on refused connections, error mapping. */
@Component
public class MlServiceClient {

    private static final Logger log = LoggerFactory.getLogger(MlServiceClient.class);

    private final RestClient client;
    private final int maxAttempts;

    @Autowired
    public MlServiceClient(MlServiceProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(properties.connectTimeout())
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.readTimeout());

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory)
                .requestInterceptor((request, body, execution) -> {
                    String requestId = MDC.get(RequestIdFilter.MDC_KEY);
                    if (requestId != null) {
                        request.getHeaders().set(RequestIdFilter.HEADER, requestId);
                    }
                    return execution.execute(request, body);
                });
        if (StringUtils.hasText(properties.apiKey())) {
            builder.defaultHeader("X-API-Key", properties.apiKey());
        }
        this.client = builder.build();
        this.maxAttempts = Math.max(1, properties.maxAttempts());
    }

    MlServiceClient(RestClient client, int maxAttempts) {
        this.client = client;
        this.maxAttempts = maxAttempts;
    }

    public PortfolioRecommendation recommend(PortfolioRequest request) {
        return call("portfolio recommendation", () -> client.post()
                .uri("/v1/portfolio/recommend")
                .body(request)
                .retrieve()
                .body(PortfolioRecommendation.class));
    }

    public StockDetail stockDetail(String ticker, RiskLevel riskLevel, String country) {
        try {
            return call("stock detail", () -> client.get()
                    .uri("/v1/stocks/{ticker}?riskLevel={risk}&country={country}", ticker, riskLevel, country)
                    .retrieve()
                    .body(StockDetail.class));
        } catch (MlServiceException e) {
            if (e.getCause() instanceof RestClientResponseException cause
                    && cause.getStatusCode().isSameCodeAs(HttpStatus.NOT_FOUND)) {
                throw new StockNotFoundException(ticker);
            }
            throw e;
        }
    }

    private <T> T call(String operation, Supplier<T> action) {
        ResourceAccessException lastFailure = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return action.get();
            } catch (ResourceAccessException e) {
                lastFailure = e;
                log.warn("ML service unreachable for {} (attempt {}/{}): {}", operation, attempt, maxAttempts,
                        e.getMessage());
                if (!(e.getCause() instanceof ConnectException)) {
                    break;
                }
            } catch (RestClientResponseException e) {
                boolean unavailable = e.getStatusCode().isSameCodeAs(HttpStatus.SERVICE_UNAVAILABLE);
                log.error("ML service returned {} for {}: {}", e.getStatusCode(), operation,
                        StringUtils.truncate(e.getResponseBodyAsString(), 300));
                throw new MlServiceException("ML service error (" + e.getStatusCode().value() + ")", unavailable, e);
            }
        }
        throw new MlServiceException("ML service is unreachable", true, lastFailure);
    }
}
