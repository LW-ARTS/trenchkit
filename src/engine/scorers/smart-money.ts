import type { TokenAnalysis } from '../../foundation/types.js'

export function scoreSmartMoneyDimension(analysis: TokenAnalysis): number {
  const smCount = analysis.smartMoneyWalletCount ?? 0
  const smVolumeRatio = analysis.smartMoneyVolumeRatio ?? 0

  // sm_count * 20, capped at 60
  let score = Math.min(smCount * 20, 60)

  // volume ratio contribution (up to 40)
  score += smVolumeRatio * 40

  // convergence bonus
  if (analysis.convergenceStrength !== null && analysis.convergenceStrength > 0) {
    score += 20
  }

  return Math.max(0, Math.min(100, score))
}
