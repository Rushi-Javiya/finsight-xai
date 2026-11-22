package com.finsight.dto;

import java.math.BigDecimal;
import java.util.Locale;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PortfolioRequest(
        @NotNull RiskLevel riskLevel,
        @Pattern(regexp = "[A-Za-z]{2}", message = "must be a two-letter country code") String country,
        @Min(3) @Max(15) Integer topN,
        @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000000000000") BigDecimal investmentAmount) {

    public static final String DEFAULT_COUNTRY = "US";
    public static final int DEFAULT_TOP_N = 8;

    public PortfolioRequest {
        country = country == null ? DEFAULT_COUNTRY : country.toUpperCase(Locale.ROOT);
        topN = topN == null ? DEFAULT_TOP_N : topN;
    }
}
