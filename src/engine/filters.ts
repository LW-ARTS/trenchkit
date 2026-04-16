import type { TokenAnalysis } from '../foundation/types.js'

export function passesHardFilters(analysis: TokenAnalysis): boolean {
  if (analysis.rugRatio !== null && analysis.rugRatio > 0.5) return false
  if (analysis.botDegenRate !== null && analysis.botDegenRate > 0.45) return false
  if (analysis.isWashTrading === true) return false
  if (analysis.holderCount !== null && analysis.holderCount < 100) return false

  if (analysis.age !== null) {
    if (analysis.age < 180 || analysis.age > 21600) return false
  }

  // Liquidity filter: skip for bonding curve tokens
  if (analysis.isOnCurve !== true) {
    if (analysis.liquidity !== null && analysis.liquidity < 5000) return false
  }

  return true
}

export type SoftFilterResult = {
  healthyGrowth: boolean
  liquidityStable: boolean
  hasSmartMoney: boolean
  hasRenowned: boolean
  lowRatTrader: boolean
}

export function evaluateSoftFilters(analysis: TokenAnalysis): SoftFilterResult {
  return {
    healthyGrowth:
      analysis.holderGrowthRate !== null &&
      analysis.holderGrowthRate >= 0.07 &&
      analysis.holderGrowthRate <= 0.5,
    liquidityStable: analysis.liquidityStable !== false,
    hasSmartMoney: (analysis.smartMoneyWalletCount ?? 0) > 0,
    hasRenowned: false, // TODO: add renowned field if available
    lowRatTrader: analysis.ratTraderRate === null || analysis.ratTraderRate < 0.3,
  }
}
