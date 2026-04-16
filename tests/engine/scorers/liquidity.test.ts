import { describe, it, expect } from 'vitest'
import { createEmptyTokenAnalysis } from '../../../src/foundation/types.js'
import { scoreLiquidityDimension } from '../../../src/engine/scorers/liquidity.js'

describe('scoreLiquidityDimension - bonding curve', () => {
  it('on bonding curve: score equals launchpadProgress * 100', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = true
    analysis.launchpadProgress = 0.5
    expect(scoreLiquidityDimension(analysis)).toBe(50)
  })

  it('on bonding curve with 0 progress = 0', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = true
    analysis.launchpadProgress = 0
    expect(scoreLiquidityDimension(analysis)).toBe(0)
  })

  it('on bonding curve with 0.8 progress = 80', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = true
    analysis.launchpadProgress = 0.8
    expect(scoreLiquidityDimension(analysis)).toBe(80)
  })

  it('on bonding curve with null progress defaults to 0', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = true
    analysis.launchpadProgress = null
    expect(scoreLiquidityDimension(analysis)).toBe(0)
  })
})

describe('scoreLiquidityDimension - DEX pool', () => {
  it('DEX pool with high liquidity (>$50k) = 100', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    analysis.liquidity = 75_000
    analysis.liquidityStable = true
    expect(scoreLiquidityDimension(analysis)).toBe(100)
  })

  it('DEX pool with low liquidity (<$10k) penalizes -40', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    analysis.liquidity = 5_000
    analysis.liquidityStable = true
    expect(scoreLiquidityDimension(analysis)).toBe(60)
  })

  it('DEX pool with mid liquidity ($10k-$50k) penalizes -15', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    analysis.liquidity = 25_000
    analysis.liquidityStable = true
    expect(scoreLiquidityDimension(analysis)).toBe(85)
  })

  it('DEX pool with unstable liquidity penalizes -30', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    analysis.liquidity = 75_000
    analysis.liquidityStable = false
    expect(scoreLiquidityDimension(analysis)).toBe(70)
  })

  it('DEX pool with low liquidity and unstable stacks both penalties', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    analysis.liquidity = 5_000
    analysis.liquidityStable = false
    expect(scoreLiquidityDimension(analysis)).toBe(30)
  })

  it('all null fields on DEX = 100 (no penalties applied)', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    // liquidity = null, liquidityStable = null
    expect(scoreLiquidityDimension(analysis)).toBe(100)
  })
})

describe('scoreLiquidityDimension - score bounds', () => {
  it('score is always >= 0', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = false
    analysis.liquidity = 1
    analysis.liquidityStable = false
    expect(scoreLiquidityDimension(analysis)).toBeGreaterThanOrEqual(0)
  })

  it('score is always <= 100', () => {
    const analysis = createEmptyTokenAnalysis('addr', 'sol')
    analysis.isOnCurve = true
    analysis.launchpadProgress = 2
    expect(scoreLiquidityDimension(analysis)).toBeLessThanOrEqual(100)
  })
})
