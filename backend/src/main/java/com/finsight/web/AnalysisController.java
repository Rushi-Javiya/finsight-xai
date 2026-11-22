package com.finsight.web;

import com.finsight.dto.AssetAllocationRequest;
import com.finsight.dto.AssetAllocationResponse;
import com.finsight.dto.FinancialHealthRequest;
import com.finsight.dto.FinancialHealthResponse;
import com.finsight.service.AssetAllocationService;
import com.finsight.service.FinancialHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Analysis")
public class AnalysisController {

    private final FinancialHealthService financialHealthService;
    private final AssetAllocationService assetAllocationService;

    public AnalysisController(FinancialHealthService financialHealthService,
                              AssetAllocationService assetAllocationService) {
        this.financialHealthService = financialHealthService;
        this.assetAllocationService = assetAllocationService;
    }

    @PostMapping("/analysis/financial-health")
    @Operation(summary = "Savings rate and emergency-fund assessment")
    public FinancialHealthResponse financialHealth(@Valid @RequestBody FinancialHealthRequest request) {
        return financialHealthService.analyze(request);
    }

    @PostMapping("/portfolio/asset-allocation")
    @Operation(summary = "Age and risk based split across stocks, ETFs, bonds and cash")
    public AssetAllocationResponse assetAllocation(@Valid @RequestBody AssetAllocationRequest request) {
        return assetAllocationService.allocate(request);
    }
}
