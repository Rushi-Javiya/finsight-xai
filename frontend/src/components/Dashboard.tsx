import type { AdviceRequest, AdviceResponse, Country } from '../api/types'
import { AssetAllocationCard } from './AssetAllocationCard'
import { FinancialHealthCard } from './FinancialHealthCard'
import { HoldingsSection } from './HoldingsSection'
import { MethodologyCard } from './MethodologyCard'
import { MetricsRow } from './MetricsRow'
import { RiskReturnCard } from './RiskReturnCard'
import { SectorExposureCard } from './SectorExposureCard'
import { WarningBanner } from './StatePanels'
import { Card } from './ui'

const CURRENCY_BY_COUNTRY: Record<Country, string> = { US: 'USD', IN: 'INR' }

interface Props {
  data: AdviceResponse
  request: AdviceRequest
}

export function Dashboard({ data, request }: Props) {
  const { portfolio } = data
  const currency = portfolio?.currency ?? CURRENCY_BY_COUNTRY[request.country ?? 'US']

  return (
    <div className="dashboard">
      <WarningBanner warnings={data.warnings} />

      <div className="grid-two">
        <FinancialHealthCard health={data.financialHealth} currency={currency} />
        <AssetAllocationCard allocation={data.assetAllocation} />
      </div>

      {portfolio ? (
        <>
          <MetricsRow portfolio={portfolio} />
          <HoldingsSection portfolio={portfolio} />
          <div className="grid-two">
            <RiskReturnCard holdings={portfolio.holdings} />
            <SectorExposureCard exposure={portfolio.sectorExposure} />
          </div>
          <MethodologyCard portfolio={portfolio} />
        </>
      ) : (
        <Card title="Stock portfolio unavailable" id="portfolio-unavailable">
          <p className="muted">
            Your financial health and asset allocation are shown above, but the stock-picking service could not be
            reached, so no individual holdings were generated. Submit again in a moment to retry.
          </p>
        </Card>
      )}
    </div>
  )
}
