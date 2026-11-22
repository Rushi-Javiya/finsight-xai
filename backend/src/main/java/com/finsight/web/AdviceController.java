package com.finsight.web;

import java.util.List;

import com.finsight.dto.AdviceHistoryItem;
import com.finsight.dto.AdviceRequest;
import com.finsight.dto.AdviceResponse;
import com.finsight.service.AdviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/advice")
@Tag(name = "Advice")
public class AdviceController {

    private final AdviceService adviceService;

    public AdviceController(AdviceService adviceService) {
        this.adviceService = adviceService;
    }

    @PostMapping
    @Operation(summary = "Financial health, asset allocation and an explained stock portfolio in one call")
    public AdviceResponse advise(@Valid @RequestBody AdviceRequest request) {
        return adviceService.advise(request);
    }

    @GetMapping("/history")
    @Operation(summary = "Most recent advice requests, newest first")
    public List<AdviceHistoryItem> history(@RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return adviceService.history(limit);
    }
}
