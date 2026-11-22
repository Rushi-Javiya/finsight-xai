package com.finsight.dto;

import java.time.Instant;
import java.util.List;

public record AdviceResponse(
        Long id,
        Instant createdAt,
        FinancialHealthResponse financialHealth,
        AssetAllocationResponse assetAllocation,
        PortfolioRecommendation portfolio,
        List<String> warnings) {
}
