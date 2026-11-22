package com.finsight.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import com.finsight.dto.FinancialHealthRequest;
import com.finsight.dto.FinancialHealthResponse;
import com.finsight.dto.FinancialHealthResponse.Status;
import com.finsight.dto.RiskLevel;
import org.junit.jupiter.api.Test;

class FinancialHealthServiceTest {

    private final FinancialHealthService service = new FinancialHealthService();

    private FinancialHealthResponse analyze(String income, String expenses) {
        return service.analyze(new FinancialHealthRequest(
                new BigDecimal(income), new BigDecimal(expenses), 30, RiskLevel.MEDIUM));
    }

    @Test
    void flagsOverspending() {
        FinancialHealthResponse response = analyze("3000", "3500");

        assertThat(response.status()).isEqualTo(Status.OVERSPENDING);
        assertThat(response.savings()).isEqualByComparingTo("-500");
        assertThat(response.savingsRate()).isEqualByComparingTo("-0.1667");
    }

    @Test
    void flagsLowSavingsBelowTwentyPercent() {
        FinancialHealthResponse response = analyze("5000", "4500");

        assertThat(response.status()).isEqualTo(Status.LOW_SAVINGS);
        assertThat(response.savingsRate()).isEqualByComparingTo("0.1");
    }

    @Test
    void exactlyTwentyPercentIsHealthy() {
        assertThat(analyze("5000", "4000").status()).isEqualTo(Status.HEALTHY);
    }

    @Test
    void computesBenchmarks() {
        FinancialHealthResponse response = analyze("5000", "3000");

        assertThat(response.recommendedMonthlySavings()).isEqualByComparingTo("1000");
        assertThat(response.emergencyFundTarget()).isEqualByComparingTo("18000");
        assertThat(response.status()).isEqualTo(Status.HEALTHY);
    }
}
