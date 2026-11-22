package com.finsight.dto;

import java.math.BigDecimal;

public record FinancialHealthResponse(
        BigDecimal savings,
        BigDecimal savingsRate,
        Status status,
        String message,
        BigDecimal recommendedMonthlySavings,
        BigDecimal emergencyFundTarget) {

    public enum Status {
        OVERSPENDING,
        LOW_SAVINGS,
        HEALTHY
    }
}
