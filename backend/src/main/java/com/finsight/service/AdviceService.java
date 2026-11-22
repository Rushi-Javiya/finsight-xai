package com.finsight.service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.finsight.client.MlServiceException;
import com.finsight.dto.AdviceHistoryItem;
import com.finsight.dto.AdviceRequest;
import com.finsight.dto.AdviceResponse;
import com.finsight.dto.AssetAllocationResponse;
import com.finsight.dto.FinancialHealthResponse;
import com.finsight.dto.PortfolioRecommendation;
import com.finsight.persistence.AdviceRecord;
import com.finsight.persistence.AdviceRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/**
 * Combines the three advice components. Financial health and asset allocation are pure computations,
 * so a failing ML service degrades the response (portfolio omitted + warning) instead of failing it.
 */
@Service
public class AdviceService {

    private static final Logger log = LoggerFactory.getLogger(AdviceService.class);

    private final FinancialHealthService financialHealthService;
    private final AssetAllocationService assetAllocationService;
    private final PortfolioService portfolioService;
    private final AdviceRecordRepository repository;
    private final Clock clock;

    public AdviceService(FinancialHealthService financialHealthService,
                         AssetAllocationService assetAllocationService,
                         PortfolioService portfolioService,
                         AdviceRecordRepository repository,
                         Clock clock) {
        this.financialHealthService = financialHealthService;
        this.assetAllocationService = assetAllocationService;
        this.portfolioService = portfolioService;
        this.repository = repository;
        this.clock = clock;
    }

    public AdviceResponse advise(AdviceRequest request) {
        FinancialHealthResponse health = financialHealthService.analyze(request.toFinancialHealthRequest());
        AssetAllocationResponse allocation = assetAllocationService.allocate(request.toAssetAllocationRequest());

        List<String> warnings = new ArrayList<>();
        PortfolioRecommendation portfolio = null;
        try {
            portfolio = portfolioService.recommend(request.toPortfolioRequest());
        } catch (MlServiceException e) {
            log.warn("Portfolio unavailable, returning partial advice: {}", e.getMessage());
            warnings.add(e.isUnavailable()
                    ? "Stock recommendations are temporarily unavailable. Your financial health and asset "
                            + "allocation are still shown."
                    : "Stock recommendations could not be generated. Please try again later.");
        }

        Instant now = clock.instant();
        return new AdviceResponse(save(request, portfolio, now), now, health, allocation, portfolio, warnings);
    }

    public List<AdviceHistoryItem> history(int limit) {
        return repository.findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "id")))
                .map(AdviceService::toHistoryItem)
                .getContent();
    }

    private Long save(AdviceRequest request, PortfolioRecommendation portfolio, Instant now) {
        try {
            String tickers = portfolio == null ? null : String.join(",",
                    portfolio.holdings().stream().map(PortfolioRecommendation.Holding::ticker).toList());
            AdviceRecord record = new AdviceRecord(
                    now,
                    request.riskLevel(),
                    request.toPortfolioRequest().country(),
                    tickers,
                    portfolio == null ? null : portfolio.metrics().expectedAnnualReturn(),
                    portfolio == null ? null : portfolio.metrics().annualVolatility());
            return repository.save(record).getId();
        } catch (RuntimeException e) {
            log.error("Failed to persist advice history", e);
            return null;
        }
    }

    private static AdviceHistoryItem toHistoryItem(AdviceRecord record) {
        List<String> tickers = record.getTickers() == null || record.getTickers().isBlank()
                ? List.of()
                : Arrays.asList(record.getTickers().split(","));
        return new AdviceHistoryItem(record.getId(), record.getCreatedAt(), record.getRiskLevel(),
                record.getCountry(), tickers, record.getExpectedAnnualReturn(), record.getAnnualVolatility());
    }
}
