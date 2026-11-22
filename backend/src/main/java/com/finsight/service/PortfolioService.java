package com.finsight.service;

import java.util.Locale;

import com.finsight.client.MlServiceClient;
import com.finsight.dto.PortfolioRecommendation;
import com.finsight.dto.PortfolioRequest;
import com.finsight.dto.RiskLevel;
import com.finsight.dto.StockDetail;
import org.springframework.stereotype.Service;

@Service
public class PortfolioService {

    private final MlServiceClient mlClient;

    public PortfolioService(MlServiceClient mlClient) {
        this.mlClient = mlClient;
    }

    public PortfolioRecommendation recommend(PortfolioRequest request) {
        return mlClient.recommend(request);
    }

    public StockDetail stockDetail(String ticker, RiskLevel riskLevel, String country) {
        return mlClient.stockDetail(ticker.toUpperCase(Locale.ROOT), riskLevel, country);
    }
}
