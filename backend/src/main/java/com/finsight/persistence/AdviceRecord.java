package com.finsight.persistence;

import java.time.Instant;

import com.finsight.dto.RiskLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Audit trail of what was recommended. Deliberately holds no personal financial figures. */
@Entity
@Table(name = "advice_record")
public class AdviceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private RiskLevel riskLevel;

    @Column(nullable = false, length = 2)
    private String country;

    @Column(length = 255)
    private String tickers;

    private Double expectedAnnualReturn;

    private Double annualVolatility;

    protected AdviceRecord() {
    }

    public AdviceRecord(Instant createdAt, RiskLevel riskLevel, String country, String tickers,
                        Double expectedAnnualReturn, Double annualVolatility) {
        this.createdAt = createdAt;
        this.riskLevel = riskLevel;
        this.country = country;
        this.tickers = tickers;
        this.expectedAnnualReturn = expectedAnnualReturn;
        this.annualVolatility = annualVolatility;
    }

    public Long getId() {
        return id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public RiskLevel getRiskLevel() {
        return riskLevel;
    }

    public String getCountry() {
        return country;
    }

    public String getTickers() {
        return tickers;
    }

    public Double getExpectedAnnualReturn() {
        return expectedAnnualReturn;
    }

    public Double getAnnualVolatility() {
        return annualVolatility;
    }
}
