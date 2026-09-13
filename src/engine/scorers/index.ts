import type { ConvictionLabel, TokenAnalysis } from "../../foundation/types.js";
import { scoreBotManipulationDimension } from "./bot-manipulation.js";
import { scoreDevTrustDimension } from "./dev-trust.js";
import { scoreHolderQualityDimension } from "./holder-quality.js";
import { scoreLiquidityDimension } from "./liquidity.js";
import { scoreSecurityDimension } from "./security.js";
import { scoreSmartMoneyDimension } from "./smart-money.js";

type DimensionWeight = { name: string; weight: number; scorer: (a: TokenAnalysis) => number };

const DIMENSIONS: DimensionWeight[] = [
  { name: "security", weight: 0.2, scorer: scoreSecurityDimension },
  { name: "holderQuality", weight: 0.25, scorer: scoreHolderQualityDimension },
  { name: "liquidity", weight: 0.15, scorer: scoreLiquidityDimension },
  { name: "devTrust", weight: 0.15, scorer: scoreDevTrustDimension },
  { name: "smartMoney", weight: 0.15, scorer: scoreSmartMoneyDimension },
  { name: "botManipulation", weight: 0.1, scorer: scoreBotManipulationDimension },
];

const TOTAL_WEIGHT = DIMENSIONS.reduce((sum, dim) => sum + dim.weight, 0);

export function calculateConviction(analysis: TokenAnalysis): TokenAnalysis {
  const scores: Record<string, number> = {};
  let weightedSum = 0;

  for (const dim of DIMENSIONS) {
    const score = dim.scorer(analysis);
    // NaN = no data for this dimension. It earns 0 but keeps its weight, so a
    // token can't score well just because the risky dimensions went unchecked.
    if (Number.isNaN(score)) continue;
    scores[dim.name] = score;
    weightedSum += score * dim.weight;
  }

  const conviction = weightedSum / TOTAL_WEIGHT;
  const finalScore = Math.round(Math.max(0, Math.min(100, conviction)));

  // Cap at 80 if partial data
  const cappedScore = analysis.partialData ? Math.min(finalScore, 80) : finalScore;

  return {
    ...analysis,
    dimensionScores: scores,
    convictionScore: cappedScore,
    convictionLabel: getLabel(cappedScore),
  };
}

function getLabel(score: number): ConvictionLabel {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "LOW";
  return "AVOID";
}
