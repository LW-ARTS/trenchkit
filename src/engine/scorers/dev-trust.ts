import type { TokenAnalysis } from "../../foundation/types.js";

export function scoreDevTrustDimension(analysis: TokenAnalysis): number {
  const openCount = analysis.creatorOpenCount ?? 0;
  const innerCount = analysis.creatorInnerCount ?? 0;
  const totalCreated = openCount + innerCount;

  // No history = neutral
  if (totalCreated === 0) return 50;

  // Use open_ratio (graduation rate)
  let graduationRate = analysis.creatorOpenRatio ?? 0;
  if (Number.isNaN(graduationRate)) graduationRate = 0;

  let score = graduationRate * 100;

  // Dev launched a serious project before
  if (analysis.devAthMc !== null && analysis.devAthMc > 1_000_000) {
    score += 15;
  }

  // Serial launcher penalty
  if (totalCreated > 20) score -= 20;

  // Many tokens, almost none graduated
  if (totalCreated > 5 && graduationRate < 0.1) score -= 30;

  return Math.max(0, Math.min(100, score));
}
