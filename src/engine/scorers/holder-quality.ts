import type { TokenAnalysis } from '../../foundation/types.js'

export function scoreHolderQualityDimension(analysis: TokenAnalysis): number {
  let score = 100

  // Top 10 concentration penalty
  if (analysis.top10HolderRate !== null && analysis.top10HolderRate > 0.5) {
    score -= (analysis.top10HolderRate - 0.5) * 200
  }

  // Holder growth bonus (7-50% is healthy)
  if (analysis.holderGrowthRate !== null && analysis.holderGrowthRate >= 0.07 && analysis.holderGrowthRate <= 0.5) {
    score += 30
  }

  // Fresh wallet penalty
  if (analysis.freshWalletRate !== null && analysis.freshWalletRate > 0.6) {
    score -= (analysis.freshWalletRate - 0.6) * 100
  }

  // Insider penalty
  if (analysis.insiderHoldRate !== null) {
    score -= analysis.insiderHoldRate * 80
  }

  // Bluechip bonus
  if (analysis.bluechipOwnerPercentage !== null && analysis.bluechipOwnerPercentage > 0.05) {
    score += 10
  }

  return Math.max(0, Math.min(100, score))
}
