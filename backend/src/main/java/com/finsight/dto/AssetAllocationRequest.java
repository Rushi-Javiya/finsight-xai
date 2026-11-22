package com.finsight.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AssetAllocationRequest(
        @Min(18) @Max(100) int age,
        @NotNull RiskLevel riskLevel) {
}
