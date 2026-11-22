package com.finsight.dto;

import java.time.Instant;
import java.util.List;

public record AdviceHistoryItem(
        Long id,
        Instant createdAt,
        RiskLevel riskLevel,
        String country,
        List<String> tickers,
        Double expectedAnnualReturn,
        Double annualVolatility) {
}
