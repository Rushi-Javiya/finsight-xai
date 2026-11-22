package com.finsight.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import com.finsight.client.MlServiceException;
import com.finsight.dto.AdviceRequest;
import com.finsight.dto.AdviceResponse;
import com.finsight.dto.PortfolioRecommendation;
import com.finsight.dto.PortfolioRecommendation.Holding;
import com.finsight.dto.PortfolioRecommendation.Metrics;
import com.finsight.dto.PortfolioRequest;
import com.finsight.dto.RiskLevel;
import com.finsight.persistence.AdviceRecord;
import com.finsight.persistence.AdviceRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

class AdviceServiceTest {

    private final PortfolioService portfolioService = mock(PortfolioService.class);
    private final AdviceRecordRepository repository = mock(AdviceRecordRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-22T10:00:00Z"), ZoneOffset.UTC);
    private AdviceService service;

    @BeforeEach
    void setUp() {
        service = new AdviceService(new FinancialHealthService(), new AssetAllocationService(),
                portfolioService, repository, clock);
        when(repository.save(any(AdviceRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private static AdviceRequest request() {
        return new AdviceRequest(new BigDecimal("5000"), new BigDecimal("3000"), 30, RiskLevel.MEDIUM,
                null, null, null);
    }

    private static PortfolioRecommendation portfolio() {
        Holding holding = new Holding("NVDA", "NVIDIA", "Technology", 1, 0.7, 1.0, null, 100, 0.3, 0.4, -0.2,
                List.of(), List.of(), "explanation", List.of());
        return new PortfolioRecommendation(Instant.now(), RiskLevel.MEDIUM, "US", "USD", "synthetic", 20,
                List.of(holding), new Metrics(0.05, 0.16, 0.07, -0.14, 1.8, 1.0, 0.04), Map.of(), null,
                Map.of(), "m", "d");
    }

    @Test
    void combinesAllThreeComponents() {
        when(portfolioService.recommend(any(PortfolioRequest.class))).thenReturn(portfolio());

        AdviceResponse response = service.advise(request());

        assertThat(response.financialHealth().savings()).isEqualByComparingTo("2000");
        assertThat(response.assetAllocation().allocations()).hasSize(4);
        assertThat(response.portfolio().holdings()).hasSize(1);
        assertThat(response.warnings()).isEmpty();
        assertThat(response.createdAt()).isEqualTo(Instant.parse("2026-11-22T10:00:00Z"));
    }

    @Test
    void appliesDefaultsToThePortfolioRequest() {
        when(portfolioService.recommend(any(PortfolioRequest.class))).thenReturn(portfolio());

        service.advise(request());

        ArgumentCaptor<PortfolioRequest> captor = ArgumentCaptor.forClass(PortfolioRequest.class);
        Mockito.verify(portfolioService).recommend(captor.capture());
        assertThat(captor.getValue().country()).isEqualTo("US");
        assertThat(captor.getValue().topN()).isEqualTo(8);
    }

    @Test
    void degradesGracefullyWhenMlServiceIsDown() {
        when(portfolioService.recommend(any(PortfolioRequest.class)))
                .thenThrow(new MlServiceException("down", true, null));

        AdviceResponse response = service.advise(request());

        assertThat(response.portfolio()).isNull();
        assertThat(response.financialHealth()).isNotNull();
        assertThat(response.assetAllocation()).isNotNull();
        assertThat(response.warnings()).singleElement().asString().contains("temporarily unavailable");
    }

    @Test
    void storesNoPersonalFiguresInHistory() {
        when(portfolioService.recommend(any(PortfolioRequest.class))).thenReturn(portfolio());

        service.advise(request());

        ArgumentCaptor<AdviceRecord> captor = ArgumentCaptor.forClass(AdviceRecord.class);
        Mockito.verify(repository).save(captor.capture());
        AdviceRecord saved = captor.getValue();
        assertThat(saved.getTickers()).isEqualTo("NVDA");
        assertThat(saved.getExpectedAnnualReturn()).isEqualTo(0.05);
        assertThat(AdviceRecord.class.getDeclaredFields()).extracting("name")
                .doesNotContain("income", "expenses", "age");
    }

    @Test
    void persistenceFailureDoesNotFailTheRequest() {
        when(portfolioService.recommend(any(PortfolioRequest.class))).thenReturn(portfolio());
        when(repository.save(any(AdviceRecord.class))).thenThrow(new IllegalStateException("db down"));

        AdviceResponse response = service.advise(request());

        assertThat(response.id()).isNull();
        assertThat(response.portfolio()).isNotNull();
    }
}
