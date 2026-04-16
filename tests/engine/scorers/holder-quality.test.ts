import { describe, it, expect } from 'vitest'
import { scoreHolderQualityDimension } from '../../../src/engine/scorers/holder-quality.js'
import { createEmptyTokenAnalysis } from '../../../src/foundation/types.js'

describe('scoreHolderQualityDimension', () => {
  it('high top10 concentration (>50%) penalizes', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.top10HolderRate = 0.8  // penalty = (0.8 - 0.5) * 200 = 60
    expect(scoreHolderQualityDimension(analysis)).toBeCloseTo(40, 5)
  })

  it('healthy holder growth (7-50%) gives +30 bonus', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderGrowthRate = 0.2
    expect(scoreHolderQualityDimension(analysis)).toBe(100)  // 100 + 30 = 130, clamped to 100
  })

  it('high fresh wallet rate (>60%) penalizes', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.freshWalletRate = 0.9  // penalty = (0.9 - 0.6) * 100 = 30
    expect(scoreHolderQualityDimension(analysis)).toBe(70)
  })

  it('insider hold rate penalizes proportionally', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.insiderHoldRate = 0.25  // penalty = 0.25 * 80 = 20
    expect(scoreHolderQualityDimension(analysis)).toBe(80)
  })

  it('bluechip owners (>5%) give +10 bonus', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.bluechipOwnerPercentage = 0.1  // > 0.05 threshold
    expect(scoreHolderQualityDimension(analysis)).toBe(100)  // 100 + 10 = 110, clamped to 100
  })

  it('all null fields = score 100 (no penalties)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    // all holder fields are null from createEmptyTokenAnalysis
    expect(scoreHolderQualityDimension(analysis)).toBe(100)
  })

  it('score is always clamped to 0-100', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.top10HolderRate = 1.0    // penalty = (1.0 - 0.5) * 200 = 100
    analysis.freshWalletRate = 1.0    // penalty = (1.0 - 0.6) * 100 = 40
    analysis.insiderHoldRate = 1.0    // penalty = 1.0 * 80 = 80
    const score = scoreHolderQualityDimension(analysis)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('top10 at exactly 50% does not penalize', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.top10HolderRate = 0.5  // exactly at threshold, no penalty
    expect(scoreHolderQualityDimension(analysis)).toBe(100)
  })

  it('holder growth outside healthy range does not give bonus', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderGrowthRate = 0.03  // below 7% threshold
    expect(scoreHolderQualityDimension(analysis)).toBe(100)
  })
})
