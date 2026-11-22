package com.finsight.dto;

import java.util.List;

public record AssetAllocationResponse(
        RiskLevel riskLevel,
        int age,
        List<Allocation> allocations,
        String explanation) {

    public enum AssetClass {
        STOCKS,
        ETFS,
        BONDS,
        CASH
    }

    public record Allocation(AssetClass assetClass, int percentage) {
    }
}
