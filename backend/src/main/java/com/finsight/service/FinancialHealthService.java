package com.finsight.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.finsight.dto.FinancialHealthRequest;
import com.finsight.dto.FinancialHealthResponse;
import com.finsight.dto.FinancialHealthResponse.Status;
import org.springframework.stereotype.Service;

@Service
public class FinancialHealthService {

    static final BigDecimal TARGET_SAVINGS_RATE = new BigDecimal("0.20");
    static final BigDecimal EMERGENCY_FUND_MONTHS = BigDecimal.valueOf(6);

    public FinancialHealthResponse analyze(FinancialHealthRequest request) {
        BigDecimal savings = request.income().subtract(request.expenses()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal savingsRate = savings.divide(request.income(), 4, RoundingMode.HALF_UP);

        Status status;
        String message;
        if (savings.signum() < 0) {
            status = Status.OVERSPENDING;
            message = "Expenses exceed income. Reduce spending before investing.";
        } else if (savingsRate.compareTo(TARGET_SAVINGS_RATE) < 0) {
            status = Status.LOW_SAVINGS;
            message = "You save less than the 20% benchmark. Try to increase your monthly savings.";
        } else {
            status = Status.HEALTHY;
            message = "Good financial health. You meet the 20% savings benchmark.";
        }

        return new FinancialHealthResponse(
                savings,
                savingsRate,
                status,
                message,
                request.income().multiply(TARGET_SAVINGS_RATE).setScale(2, RoundingMode.HALF_UP),
                request.expenses().multiply(EMERGENCY_FUND_MONTHS).setScale(2, RoundingMode.HALF_UP));
    }
}
