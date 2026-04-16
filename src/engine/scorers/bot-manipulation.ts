import type { TokenAnalysis } from '../../foundation/types.js'

export function scoreBotManipulationDimension(analysis: TokenAnalysis): number {
  let base = 100

  if (analysis.botDegenRate !== null) base -= analysis.botDegenRate * 80
  if (analysis.bundlerRate !== null) base -= analysis.bundlerRate * 60
  if (analysis.ratTraderRate !== null) base -= analysis.ratTraderRate * 40
  if (analysis.sniperCount !== null && analysis.sniperCount > 20) base -= 15
  if (analysis.privateVaultHoldRate !== null && analysis.privateVaultHoldRate > 0.3) base -= 20

  return Math.max(0, Math.min(100, base))
}
