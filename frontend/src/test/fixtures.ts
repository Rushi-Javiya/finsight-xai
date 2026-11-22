import type {
  AdviceHistoryItem,
  AdviceResponse,
  FactorContribution,
  Holding,
  PortfolioRecommendation,
  StockDetail,
} from '../api/types'

const factor = (
  key: string,
  label: string,
  displayValue: string,
  zScore: number,
  weight: number,
  percentile: number | null = 80,
  imputed = false,
): FactorContribution => ({
  factor: key,
  label,
  rawValue: imputed ? null : 0.5,
  displayValue,
  percentile: imputed ? null : percentile,
  zScore,
  weight,
  contribution: Number((weight * zScore).toFixed(4)),
  imputed,
})

const nvdaFactors: FactorContribution[] = [
  factor('growth', 'Growth', '100.0%', 2.6, 0.15, 100),
  factor('momentum', 'Momentum', '+84.2%', 1.9, 0.2, 96),
  factor('low_volatility', 'Low volatility', '41.2%', -1.4, 0.15, 12),
  factor('value', 'Value', '48.1x P/E', -0.6, 0.15, 30),
  factor('quality', 'Quality', '55.0% margin', 0.8, 0.1, 78),
  factor('sentiment', 'Sentiment', 'n/a', 0, 0.05, null, true),
]

const nvda: Holding = {
  ticker: 'NVDA',
  name: 'NVIDIA Corporation',
  sector: 'Technology',
  rank: 1,
  score: Number(nvdaFactors.reduce((sum, item) => sum + item.contribution, 0).toFixed(4)),
  weight: 0.22,
  allocationAmount: 2200,
  price: 180.12,
  annualReturn: 0.31,
  volatility: 0.4118,
  maxDrawdown: -0.2,
  factors: nvdaFactors,
  mlDrivers: [
    { feature: 'mom_126', label: '6-month momentum', value: -0.4157, contribution: 0.0528 },
    { feature: 'vol_63', label: '3-month volatility', value: 0.38, contribution: -0.0214 },
  ],
  explanation:
    'NVIDIA Corporation ranks #1 of 20 for a medium-risk profile, mainly because of strong growth and momentum, partly offset by high volatility.',
  dataQualityNotes: ['Sentiment data was unavailable and treated as neutral.'],
}

const jpmFactors: FactorContribution[] = [
  factor('quality', 'Quality', '31.0% margin', 1.5, 0.1, 90),
  factor('low_volatility', 'Low volatility', '19.5%', 1.1, 0.15, 85),
  factor('growth', 'Growth', '+4.0%', -0.3, 0.15, 40),
]

const jpm: Holding = {
  ticker: 'JPM',
  name: 'JPMorgan Chase & Co.',
  sector: 'Financial Services',
  rank: 2,
  score: Number(jpmFactors.reduce((sum, item) => sum + item.contribution, 0).toFixed(4)),
  weight: 0.41,
  allocationAmount: 4100,
  price: 245.5,
  annualReturn: 0.12,
  volatility: 0.195,
  maxDrawdown: -0.11,
  factors: jpmFactors,
  mlDrivers: [],
  explanation: 'JPMorgan Chase & Co. ranks #2 of 20, driven by quality and low volatility.',
  dataQualityNotes: [],
}

const meta: Holding = {
  ticker: 'META',
  name: 'Meta Platforms, Inc.',
  sector: 'Communication Services',
  rank: 3,
  score: 0.31,
  weight: 0.37,
  allocationAmount: 3700,
  price: 590.1,
  annualReturn: -0.04,
  volatility: 0.33,
  maxDrawdown: -0.25,
  factors: [factor('momentum', 'Momentum', '-2.0%', -0.2, 0.2, 40)],
  mlDrivers: [],
  explanation: 'Meta Platforms, Inc. ranks #3 of 20.',
  dataQualityNotes: [],
}

export const portfolioFixture: PortfolioRecommendation = {
  asOf: '2026-11-20T00:00:00Z',
  riskLevel: 'MEDIUM',
  country: 'US',
  currency: 'USD',
  dataSource: 'yahoo',
  universeSize: 20,
  holdings: [nvda, jpm, meta],
  metrics: {
    expectedAnnualReturn: 0.0513,
    annualVolatility: 0.1601,
    sharpeRatio: 0.071,
    maxDrawdown: -0.1413,
    diversificationRatio: 1.837,
    effectiveHoldings: 7.11,
    riskFreeRate: 0.04,
  },
  sectorExposure: { 'Financial Services': 0.41, Technology: 0.22, 'Communication Services': 0.37 },
  model: {
    name: 'XGBoost relative-return ranker',
    trainedSamples: 2160,
    validationRankIc: -0.094,
    active: false,
    horizonDays: 21,
    features: ['1-month momentum', '6-month momentum', '3-month volatility'],
  },
  factorWeights: {
    momentum: 0.25,
    low_volatility: 0.15,
    value: 0.15,
    growth: 0.15,
    quality: 0.1,
    sentiment: 0.05,
    ml_signal: 0,
  },
  methodology: 'Stocks are ranked by a weighted sum of z-scored factors.',
  disclaimer: 'Educational use only. This is not investment advice.',
}

export const adviceFixture: AdviceResponse = {
  id: 12,
  createdAt: '2026-11-22T10:15:30Z',
  financialHealth: {
    savings: 2000,
    savingsRate: 0.4,
    status: 'HEALTHY',
    message: 'Good financial health',
    recommendedMonthlySavings: 1000,
    emergencyFundTarget: 18000,
  },
  assetAllocation: {
    riskLevel: 'MEDIUM',
    age: 30,
    allocations: [
      { assetClass: 'STOCKS', percentage: 36 },
      { assetClass: 'ETFS', percentage: 44 },
      { assetClass: 'BONDS', percentage: 15 },
      { assetClass: 'CASH', percentage: 5 },
    ],
    explanation: 'At 30 with a medium risk tolerance, a growth-oriented mix is appropriate.',
  },
  portfolio: portfolioFixture,
  warnings: [],
}

export const adviceWithoutPortfolioFixture: AdviceResponse = {
  ...adviceFixture,
  portfolio: null,
  warnings: ['The ML service is unavailable, so no stock portfolio could be generated.'],
}

export const historyFixture: AdviceHistoryItem[] = [
  {
    id: 12,
    createdAt: '2026-11-22T10:15:30Z',
    riskLevel: 'MEDIUM',
    country: 'US',
    tickers: ['NVDA', 'META', 'JPM'],
    expectedAnnualReturn: 0.0513,
    annualVolatility: 0.1601,
  },
  {
    id: 11,
    createdAt: '2026-11-21T08:00:00Z',
    riskLevel: 'LOW',
    country: 'IN',
    tickers: [],
    expectedAnnualReturn: null,
    annualVolatility: null,
  },
]

export const stockDetailFixture: StockDetail = {
  ...nvda,
  asOf: '2026-11-20T00:00:00Z',
  riskLevel: 'MEDIUM',
  country: 'US',
  currency: 'USD',
  dataSource: 'yahoo',
  universeSize: 20,
  disclaimer: 'Educational use only.',
  priceHistory: [
    { date: '2026-05-20', close: 140 },
    { date: '2026-08-20', close: 160 },
    { date: '2026-11-20', close: 180.12 },
  ],
}

export const problemJson = (status: number, title: string, detail?: string, errors?: Record<string, string>) =>
  new Response(JSON.stringify({ type: 'about:blank', title, status, detail, errors }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
