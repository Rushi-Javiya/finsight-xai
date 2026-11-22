export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type Country = 'US' | 'IN'
export type HealthStatus = 'OVERSPENDING' | 'LOW_SAVINGS' | 'HEALTHY'
export type AssetClass = 'STOCKS' | 'ETFS' | 'BONDS' | 'CASH'

export interface AdviceRequest {
  income: number
  expenses: number
  age: number
  riskLevel: RiskLevel
  country?: Country
  topN?: number
  investmentAmount?: number
}

export interface FinancialHealth {
  savings: number
  savingsRate: number
  status: HealthStatus
  message: string
  recommendedMonthlySavings: number
  emergencyFundTarget: number
}

export interface Allocation {
  assetClass: AssetClass
  percentage: number
}

export interface AssetAllocation {
  riskLevel: RiskLevel
  age: number
  allocations: Allocation[]
  explanation: string
}

export interface FactorContribution {
  factor: string
  label: string
  rawValue: number | null
  displayValue: string
  percentile: number | null
  zScore: number
  weight: number
  contribution: number
  imputed: boolean
}

export interface MlDriver {
  feature: string
  label: string
  value: number | null
  contribution: number
}

export interface StockExplanation {
  ticker: string
  name: string
  sector: string
  rank: number
  score: number
  price: number
  annualReturn: number
  volatility: number
  maxDrawdown: number
  factors: FactorContribution[]
  mlDrivers: MlDriver[]
  explanation: string
  dataQualityNotes: string[]
}

export interface Holding extends StockExplanation {
  weight: number
  allocationAmount?: number | null
}

export interface PortfolioMetrics {
  expectedAnnualReturn: number
  annualVolatility: number
  sharpeRatio: number
  maxDrawdown: number
  diversificationRatio: number
  effectiveHoldings: number
  riskFreeRate: number
}

export interface ModelInfo {
  name: string
  trainedSamples: number
  validationRankIc: number | null
  active: boolean
  horizonDays: number
  features: string[]
}

export interface PortfolioRecommendation {
  asOf: string
  riskLevel: RiskLevel
  country: Country
  currency: string
  dataSource: string
  universeSize: number
  holdings: Holding[]
  metrics: PortfolioMetrics
  sectorExposure: Record<string, number>
  model: ModelInfo | null
  factorWeights: Record<string, number>
  methodology: string
  disclaimer: string
}

export interface AdviceResponse {
  id: number
  createdAt: string
  financialHealth: FinancialHealth
  assetAllocation: AssetAllocation
  portfolio: PortfolioRecommendation | null
  warnings: string[]
}

export interface AdviceHistoryItem {
  id: number
  createdAt: string
  riskLevel: RiskLevel
  country: Country
  tickers: string[]
  expectedAnnualReturn: number | null
  annualVolatility: number | null
}

export interface PricePoint {
  date: string
  close: number
}

export interface StockDetail extends StockExplanation {
  asOf: string
  riskLevel: RiskLevel
  country: Country
  currency: string
  dataSource: string
  universeSize: number
  disclaimer: string
  priceHistory: PricePoint[]
}

export interface ProblemDocument {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string>
}
