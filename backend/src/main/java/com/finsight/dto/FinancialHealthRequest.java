package com.finsight.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FinancialHealthRequest(
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000000000") BigDecimal income,
        @NotNull @DecimalMin("0") @DecimalMax("1000000000") BigDecimal expenses,
        @Min(18) @Max(100) int age,
        @NotNull RiskLevel riskLevel) {
}
