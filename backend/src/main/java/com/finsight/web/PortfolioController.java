package com.finsight.web;

import java.util.Locale;

import com.finsight.dto.PortfolioRecommendation;
import com.finsight.dto.PortfolioRequest;
import com.finsight.dto.RiskLevel;
import com.finsight.dto.StockDetail;
import com.finsight.service.PortfolioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @PostMapping("/portfolio/recommendations")
    @Operation(summary = "Explained stock portfolio for a risk profile")
    public PortfolioRecommendation recommend(@Valid @RequestBody PortfolioRequest request) {
        return portfolioService.recommend(request);
    }

    @GetMapping("/stocks/{ticker}")
    @Operation(summary = "Factor-level explanation for a single stock")
    public StockDetail stock(
            @PathVariable @Pattern(regexp = "[A-Za-z0-9.^-]{1,15}", message = "invalid ticker") String ticker,
            @RequestParam(defaultValue = "MEDIUM") RiskLevel riskLevel,
            @RequestParam(defaultValue = PortfolioRequest.DEFAULT_COUNTRY)
            @Pattern(regexp = "[A-Za-z]{2}", message = "must be a two-letter country code") String country) {
        return portfolioService.stockDetail(ticker, riskLevel, country.toUpperCase(Locale.ROOT));
    }
}
