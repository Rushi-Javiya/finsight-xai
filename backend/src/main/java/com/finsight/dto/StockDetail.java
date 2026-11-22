package com.finsight.dto;

import java.time.Instant;
import java.util.List;

import com.finsight.dto.PortfolioRecommendation.FactorContribution;
import com.finsight.dto.PortfolioRecommendation.MlDriver;

public record StockDetail(
        Instant asOf,
        RiskLevel riskLevel,
        String country,
        String currency,
        String dataSource,
        int universeSize,
        String ticker,
        String name,
        String sector,
        int rank,
        double score,
        double price,
        double annualReturn,
        double volatility,
        double maxDrawdown,
        List<FactorContribution> factors,
        List<MlDriver> mlDrivers,
        String explanation,
        List<String> dataQualityNotes,
        List<PricePoint> priceHistory,
        String disclaimer) {

    public record PricePoint(String date, double close) {
    }
}
