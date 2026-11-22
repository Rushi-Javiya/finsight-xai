package com.finsight.service;

import java.util.List;

import com.finsight.dto.AssetAllocationRequest;
import com.finsight.dto.AssetAllocationResponse;
import com.finsight.dto.AssetAllocationResponse.Allocation;
import com.finsight.dto.AssetAllocationResponse.AssetClass;
import com.finsight.dto.RiskLevel;
import org.springframework.stereotype.Service;

/**
 * Age-based glide path ("110 minus age" equity rule) shifted by risk tolerance, with the cash buffer
 * and the stock-versus-ETF split also set by risk profile.
 */
@Service
public class AssetAllocationService {

    private static final int MIN_EQUITY = 20;
    private static final int MAX_EQUITY = 90;

    public AssetAllocationResponse allocate(AssetAllocationRequest request) {
        RiskLevel risk = request.riskLevel();
        int cash = cashBuffer(risk);
        int equity = Math.min(
                Math.max(110 - request.age() + riskAdjustment(risk), MIN_EQUITY), Math.min(MAX_EQUITY, 100 - cash));
        int stocks = (int) Math.round(equity * directStockShare(risk));
        int etfs = equity - stocks;
        int bonds = 100 - equity - cash;

        List<Allocation> allocations = List.of(
                new Allocation(AssetClass.STOCKS, stocks),
                new Allocation(AssetClass.ETFS, etfs),
                new Allocation(AssetClass.BONDS, bonds),
                new Allocation(AssetClass.CASH, cash));

        String explanation = "At age %d, the 110-minus-age rule suggests about %d%% in growth assets. "
                .formatted(request.age(), 110 - request.age())
                + "A %s risk profile adjusts this to %d%% equity (%d%% individual stocks, %d%% diversified ETFs), "
                        .formatted(risk.name().toLowerCase(), equity, stocks, etfs)
                + "%d%% bonds for stability and a %d%% cash buffer.".formatted(bonds, cash);

        return new AssetAllocationResponse(risk, request.age(), allocations, explanation);
    }

    private static int riskAdjustment(RiskLevel risk) {
        return switch (risk) {
            case LOW -> -15;
            case MEDIUM -> 0;
            case HIGH -> 10;
        };
    }

    private static int cashBuffer(RiskLevel risk) {
        return switch (risk) {
            case LOW -> 10;
            case MEDIUM -> 5;
            case HIGH -> 3;
        };
    }

    private static double directStockShare(RiskLevel risk) {
        return switch (risk) {
            case LOW -> 0.30;
            case MEDIUM -> 0.45;
            case HIGH -> 0.60;
        };
    }
}
