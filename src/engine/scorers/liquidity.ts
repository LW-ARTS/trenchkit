import type { TokenAnalysis } from '../../foundation/types.js'

export function scoreLiquidityDimension(analysis: TokenAnalysis): number {
  // Bonding curve: pool metrics don't apply
  if (analysis.isOnCurve === true) {
    const progress = analysis.launchpadProgress ?? 0
    return Math.max(0, Math.min(100, progress * 100))
  }

  // DEX pool: standard liquidity metrics
  let base = 100

  if (analysis.liquidity !== null) {
    if (analysis.liquidity < 10_000) base -= 40
    else if (analysis.liquidity < 50_000) base -= 15
  }

  if (analysis.liquidityStable === false) base -= 30

  // Pool age penalty would go here if we had pool creation timestamp
  // For now, we only penalize instability

  return Math.max(0, Math.min(100, base))
}
