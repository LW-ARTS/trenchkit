import { describe, it, expect } from 'vitest'
import { passesHardFilters, evaluateSoftFilters } from '../../src/engine/filters.js'
import { createEmptyTokenAnalysis } from '../../src/foundation/types.js'

describe('passesHardFilters', () => {
  it('clean token passes all hard filters', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.rugRatio = 0.1
    analysis.botDegenRate = 0.1
    analysis.isWashTrading = false
    analysis.holderCount = 500
    analysis.age = 1800         // 30 minutes, within 180-21600 range
    analysis.liquidity = 10_000
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('rug_ratio > 0.5 fails', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.rugRatio = 0.51
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('rug_ratio exactly 0.5 passes (boundary)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.rugRatio = 0.5
    analysis.holderCount = 100
    analysis.age = 1800
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('bot_degen_rate > 0.45 fails', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.botDegenRate = 0.46
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('bot_degen_rate exactly 0.45 passes (boundary)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.botDegenRate = 0.45
    analysis.holderCount = 100
    analysis.age = 1800
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('is_wash_trading true fails', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.isWashTrading = true
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('is_wash_trading false passes', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.isWashTrading = false
    analysis.holderCount = 100
    analysis.age = 1800
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('is_wash_trading null passes (unknown)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.isWashTrading = null
    analysis.holderCount = 100
    analysis.age = 1800
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('holder_count < 100 fails', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 99
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('holder_count exactly 100 passes (boundary)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 100
    analysis.age = 1800
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('age < 180s fails (too young)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 500
    analysis.age = 179
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('age > 21600s fails (too old)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 500
    analysis.age = 21601
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('age exactly 180s passes (lower boundary)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 100
    analysis.age = 180
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('age exactly 21600s passes (upper boundary)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 100
    analysis.age = 21600
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('age null passes (unknown age not filtered)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 100
    analysis.age = null
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('liquidity < $5k fails for DEX token', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 500
    analysis.age = 1800
    analysis.isOnCurve = false
    analysis.liquidity = 4999
    expect(passesHardFilters(analysis)).toBe(false)
  })

  it('liquidity exactly $5k passes (boundary) for DEX token', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 100
    analysis.age = 1800
    analysis.isOnCurve = false
    analysis.liquidity = 5000
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('liquidity < $5k passes when isOnCurve=true (bonding curve bypass)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 500
    analysis.age = 1800
    analysis.isOnCurve = true
    analysis.liquidity = 1000 // below threshold but bonding curve token
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('liquidity null passes (unknown liquidity not filtered)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderCount = 100
    analysis.age = 1800
    analysis.isOnCurve = false
    analysis.liquidity = null
    expect(passesHardFilters(analysis)).toBe(true)
  })

  it('all null fields pass (no penalties apply)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    // All relevant fields remain null from createEmptyTokenAnalysis
    expect(passesHardFilters(analysis)).toBe(true)
  })
})

describe('evaluateSoftFilters', () => {
  it('healthy growth rate (7-50%) returns healthyGrowth=true', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderGrowthRate = 0.15
    const result = evaluateSoftFilters(analysis)
    expect(result.healthyGrowth).toBe(true)
  })

  it('growth rate below 7% returns healthyGrowth=false', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderGrowthRate = 0.05
    const result = evaluateSoftFilters(analysis)
    expect(result.healthyGrowth).toBe(false)
  })

  it('growth rate above 50% returns healthyGrowth=false (suspicious spike)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderGrowthRate = 0.6
    const result = evaluateSoftFilters(analysis)
    expect(result.healthyGrowth).toBe(false)
  })

  it('growth rate null returns healthyGrowth=false', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.holderGrowthRate = null
    const result = evaluateSoftFilters(analysis)
    expect(result.healthyGrowth).toBe(false)
  })

  it('liquidityStable=false returns liquidityStable=false', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.liquidityStable = false
    const result = evaluateSoftFilters(analysis)
    expect(result.liquidityStable).toBe(false)
  })

  it('liquidityStable=null returns liquidityStable=true (benefit of doubt)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.liquidityStable = null
    const result = evaluateSoftFilters(analysis)
    expect(result.liquidityStable).toBe(true)
  })

  it('smartMoneyWalletCount > 0 returns hasSmartMoney=true', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 2
    const result = evaluateSoftFilters(analysis)
    expect(result.hasSmartMoney).toBe(true)
  })

  it('smartMoneyWalletCount = 0 returns hasSmartMoney=false', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.smartMoneyWalletCount = 0
    const result = evaluateSoftFilters(analysis)
    expect(result.hasSmartMoney).toBe(false)
  })

  it('ratTraderRate < 0.3 returns lowRatTrader=true', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.ratTraderRate = 0.2
    const result = evaluateSoftFilters(analysis)
    expect(result.lowRatTrader).toBe(true)
  })

  it('ratTraderRate >= 0.3 returns lowRatTrader=false', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.ratTraderRate = 0.3
    const result = evaluateSoftFilters(analysis)
    expect(result.lowRatTrader).toBe(false)
  })

  it('ratTraderRate null returns lowRatTrader=true (benefit of doubt)', () => {
    const analysis = createEmptyTokenAnalysis('SoLaddr', 'sol')
    analysis.ratTraderRate = null
    const result = evaluateSoftFilters(analysis)
    expect(result.lowRatTrader).toBe(true)
  })
})
