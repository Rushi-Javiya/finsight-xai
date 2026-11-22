package com.finsight.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties("finsight.ml")
public record MlServiceProperties(
        @DefaultValue("http://localhost:8000") String baseUrl,
        String apiKey,
        @DefaultValue("2s") Duration connectTimeout,
        @DefaultValue("60s") Duration readTimeout,
        @DefaultValue("2") int maxAttempts) {
}
