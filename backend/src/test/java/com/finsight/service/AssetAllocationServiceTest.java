package com.finsight.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.stream.Collectors;

import com.finsight.dto.AssetAllocationRequest;
import com.finsight.dto.AssetAllocationResponse;
import com.finsight.dto.AssetAllocationResponse.AssetClass;
import com.finsight.dto.RiskLevel;
import org.junit.jupiter.api.Test;

class AssetAllocationServiceTest {

    private final AssetAllocationService service = new AssetAllocationService();

    private Map<AssetClass, Integer> allocate(int age, RiskLevel risk) {
        AssetAllocationResponse response = service.allocate(new AssetAllocationRequest(age, risk));
        return response.allocations().stream()
                .collect(Collectors.toMap(AssetAllocationResponse.Allocation::assetClass,
                        AssetAllocationResponse.Allocation::percentage));
    }

    @Test
    void mediumRiskThirtyYearOld() {
        assertThat(allocate(30, RiskLevel.MEDIUM)).containsEntry(AssetClass.STOCKS, 36)
                .containsEntry(AssetClass.ETFS, 44)
                .containsEntry(AssetClass.BONDS, 15)
                .containsEntry(AssetClass.CASH, 5);
    }

    @Test
    void alwaysSumsToOneHundredWithNoNegativeBucket() {
        for (RiskLevel risk : RiskLevel.values()) {
            for (int age = 18; age <= 100; age++) {
                Map<AssetClass, Integer> result = allocate(age, risk);
                assertThat(result.values()).allMatch(value -> value >= 0);
                assertThat(result.values().stream().mapToInt(Integer::intValue).sum())
                        .as("age %d risk %s", age, risk).isEqualTo(100);
            }
        }
    }

    @Test
    void equityShrinksWithAgeAndGrowsWithRiskAppetite() {
        int youngEquity = equity(allocate(25, RiskLevel.MEDIUM));
        int olderEquity = equity(allocate(65, RiskLevel.MEDIUM));

        assertThat(olderEquity).isLessThan(youngEquity);
        assertThat(equity(allocate(40, RiskLevel.HIGH))).isGreaterThan(equity(allocate(40, RiskLevel.LOW)));
    }

    private static int equity(Map<AssetClass, Integer> allocation) {
        return allocation.get(AssetClass.STOCKS) + allocation.get(AssetClass.ETFS);
    }
}
