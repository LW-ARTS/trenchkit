import { describe, it, expect } from 'vitest'
import { scoreSmartMoneyDimension } from '../../../src/engine/scorers/smart-money.js'
import { createEmptyTokenAnalysis } from '../../../src/foundation/types.js'

describe('scoreSmartMoneyDimension', () => {
  it('0 smart money wallets = 0 score', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 0
    analysis.smartMoneyVolumeRatio = 0
    expect(scoreSmartMoneyDimension(analysis)).toBe(0)
  })

  it('3 SM wallets = 60 (capped)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 3
    analysis.smartMoneyVolumeRatio = 0
    expect(scoreSmartMoneyDimension(analysis)).toBe(60)
  })

  it('5 SM wallets still = 60 (cap)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 5
    analysis.smartMoneyVolumeRatio = 0
    expect(scoreSmartMoneyDimension(analysis)).toBe(60)
  })

  it('SM volume ratio 0.5 adds 20', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 0
    analysis.smartMoneyVolumeRatio = 0.5
    // 0 + 0.5 * 40 = 20
    expect(scoreSmartMoneyDimension(analysis)).toBe(20)
  })

  it('convergence detected adds 20 bonus', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 0
    analysis.smartMoneyVolumeRatio = 0
    analysis.convergenceStrength = 1
    expect(scoreSmartMoneyDimension(analysis)).toBe(20)
  })

  it('max score with everything = 100 (clamped)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 5   // 60 (capped)
    analysis.smartMoneyVolumeRatio = 1.0 // +40
    analysis.convergenceStrength = 1     // +20 -> 120, clamped to 100
    expect(scoreSmartMoneyDimension(analysis)).toBe(100)
  })

  it('all null = 0', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    // smartMoneyWalletCount, smartMoneyVolumeRatio, convergenceStrength all null
    expect(scoreSmartMoneyDimension(analysis)).toBe(0)
  })
})
