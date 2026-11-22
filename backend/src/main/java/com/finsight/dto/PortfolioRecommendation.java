package com.finsight.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Mirrors the ML service response; see docs/API.md for field semantics. */
public record PortfolioRecommendation(
        Instant asOf,
        RiskLevel riskLevel,
        String country,
        String currency,
        String dataSource,
        int universeSize,
        List<Holding> holdings,
        Metrics metrics,
        Map<String, Double> sectorExposure,
        ModelInfo model,
        Map<String, Double> factorWeights,
        String methodology,
        String disclaimer) {

    public record Holding(
            String ticker,
            String name,
            String sector,
            int rank,
            double score,
            double weight,
            Double allocationAmount,
            double price,
            double annualReturn,
            double volatility,
            double maxDrawdown,
            List<FactorContribution> factors,
            List<MlDriver> mlDrivers,
            String explanation,
            List<String> dataQualityNotes) {
    }

    public record FactorContribution(
            String factor,
            String label,
            Double rawValue,
            String displayValue,
            Double percentile,
            double zScore,
            double weight,
            double contribution,
            boolean imputed) {
    }

    public record MlDriver(String feature, String label, Double value, double contribution) {
    }

    public record Metrics(
            double expectedAnnualReturn,
            double annualVolatility,
            double sharpeRatio,
            double maxDrawdown,
            double diversificationRatio,
            double effectiveHoldings,
            double riskFreeRate) {
    }

    public record ModelInfo(
            String name,
            int trainedSamples,
            Double validationRankIc,
            boolean active,
            int horizonDays,
            List<String> features) {
    }
}
