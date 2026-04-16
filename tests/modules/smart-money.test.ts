import { describe, it, expect } from 'vitest'
import { SmartMoneyTracker } from '../../src/modules/smart-money.js'
import type { NormalizedTrade } from '../../src/modules/smart-money.js'
import type { GmgnSmartMoneyTrade } from '../../src/foundation/api-types.js'
import type { GmgnClient } from '../../src/foundation/api/client.js'

// Minimal GmgnClient stub — only user.getKolTrades and user.getSmartMoneyTrades used
function makeClient(
  kolTrades: GmgnSmartMoneyTrade[] = [],
  smTrades: GmgnSmartMoneyTrade[] = []
): GmgnClient {
  return {
    user: {
      getKolTrades: () => Promise.resolve(kolTrades),
      getSmartMoneyTrades: () => Promise.resolve(smTrades),
      getWalletStats: () => Promise.reject(new Error('not used')),
      getWalletHoldings: () => Promise.reject(new Error('not used')),
      getWalletActivity: () => Promise.reject(new Error('not used')),
      getCreatedTokens: () => Promise.reject(new Error('not used')),
    },
    token: {} as GmgnClient['token'],
    market: {} as GmgnClient['market'],
    trade: {} as GmgnClient['trade'],
  }
}

const NOW_SEC = Math.floor(Date.now() / 1000)

function makeSmTrade(overrides: Partial<GmgnSmartMoneyTrade> = {}): GmgnSmartMoneyTrade {
  return {
    wallet_address: 'wallet1',
    token_address: 'tokenAAA',
    symbol: 'AAA',
    side: 'buy',
    amount: 1000,
    value_usd: 500,
    price: 0.001,
    timestamp: NOW_SEC - 60, // 1 min ago, within 15min window
    ...overrides,
  }
}

describe('SmartMoneyTracker - convergence detection', () => {
  it('produces a convergence alert when 2 distinct wallets buy the same token', () => {
    const client = makeClient(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1', token_address: 'tokenAAA' }),
        makeSmTrade({ wallet_address: 'wallet2', token_address: 'tokenAAA' }),
      ]
    )
    const tracker = new SmartMoneyTracker(client, 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1', token_address: 'tokenAAA' }),
        makeSmTrade({ wallet_address: 'wallet2', token_address: 'tokenAAA' }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.tokenAddress).toBe('tokenAAA')
    expect(alerts[0]?.walletCount).toBe(2)
  })

  it('does NOT produce a convergence alert when only 1 wallet buys', () => {
    const trader = makeSmTrade({ wallet_address: 'wallet1', token_address: 'tokenAAA' })
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken([], [trader], NOW_SEC - 15 * 60)
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts).toHaveLength(0)
  })

  it('does NOT produce a convergence alert when same wallet buys multiple times', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1', token_address: 'tokenAAA', timestamp: NOW_SEC - 60 }),
        makeSmTrade({ wallet_address: 'wallet1', token_address: 'tokenAAA', timestamp: NOW_SEC - 30 }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts).toHaveLength(0)
  })

  it('sets isDivergence=true when KOL is buying but SM is selling the same token', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const kolTrade = makeSmTrade({ wallet_address: 'kolWallet', token_address: 'tokenBBB', side: 'buy' })
    const smTrade1 = makeSmTrade({ wallet_address: 'smWallet1', token_address: 'tokenBBB', side: 'sell' })
    const smTrade2 = makeSmTrade({ wallet_address: 'smWallet2', token_address: 'tokenBBB', side: 'buy' })

    const byToken = tracker.groupByToken(
      [kolTrade],
      [smTrade1, smTrade2],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.isDivergence).toBe(true)
  })

  it('sets isDivergence=false when all buyers are aligned', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1', token_address: 'tokenCCC', side: 'buy' }),
        makeSmTrade({ wallet_address: 'wallet2', token_address: 'tokenCCC', side: 'buy' }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.isDivergence).toBe(false)
  })
})

describe('SmartMoneyTracker - signal strength classification', () => {
  it('classifies WEAK for a single KOL buy with one other buyer', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [makeSmTrade({ wallet_address: 'kolWallet', token_address: 'tokenDDD', side: 'buy' })],
      [makeSmTrade({ wallet_address: 'smWallet1', token_address: 'tokenDDD', side: 'buy' })],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.signalLevel).toBe('WEAK')
  })

  it('classifies MEDIUM for 2 SM wallets buying', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'smWallet1', token_address: 'tokenEEE', side: 'buy' }),
        makeSmTrade({ wallet_address: 'smWallet2', token_address: 'tokenEEE', side: 'buy' }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.signalLevel).toBe('MEDIUM')
  })

  it('classifies MEDIUM when a trade has isFullOpen (is_open_or_close=0)', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'smWallet1', token_address: 'tokenFFF', side: 'buy', is_open_or_close: 0 }),
        makeSmTrade({ wallet_address: 'smWallet2', token_address: 'tokenFFF', side: 'buy', is_open_or_close: 1 }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.signalLevel).toBe('MEDIUM')
    // Confirm the full-open trade is normalized correctly
    const fullOpenTrade = alerts[0]?.trades.find((t) => t.isFullOpen)
    expect(fullOpenTrade).toBeDefined()
  })

  it('classifies STRONG for >= 3 distinct wallet buyers', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'smWallet1', token_address: 'tokenGGG', side: 'buy' }),
        makeSmTrade({ wallet_address: 'smWallet2', token_address: 'tokenGGG', side: 'buy' }),
        makeSmTrade({ wallet_address: 'smWallet3', token_address: 'tokenGGG', side: 'buy' }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.signalLevel).toBe('STRONG')
  })

  it('classifies VERY_STRONG for KOL + 2 SM with full open', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [makeSmTrade({ wallet_address: 'kolWallet', token_address: 'tokenHHH', side: 'buy' })],
      [
        makeSmTrade({ wallet_address: 'smWallet1', token_address: 'tokenHHH', side: 'buy', is_open_or_close: 0 }),
        makeSmTrade({ wallet_address: 'smWallet2', token_address: 'tokenHHH', side: 'buy' }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.signalLevel).toBe('VERY_STRONG')
  })
})

describe('SmartMoneyTracker - is_open_or_close normalization', () => {
  it('normalizes is_open_or_close=0 as isFullOpen=true (position opened)', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1', is_open_or_close: 0 }),
        makeSmTrade({ wallet_address: 'wallet2', is_open_or_close: 1 }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    const trades = alerts[0]?.trades ?? []
    const wallet1Trade = trades.find((t) => t.maker === 'wallet1')
    const wallet2Trade = trades.find((t) => t.maker === 'wallet2')

    expect(wallet1Trade?.isFullOpen).toBe(true)   // 0 = opened
    expect(wallet2Trade?.isFullOpen).toBe(false)  // 1 = closed
  })

  it('normalizes missing is_open_or_close as isFullOpen=false', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1' }),
        makeSmTrade({ wallet_address: 'wallet2' }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    for (const trade of alerts[0]?.trades ?? []) {
      expect(trade.isFullOpen).toBe(false)
    }
  })
})

describe('SmartMoneyTracker - convergence strength formula', () => {
  it('convergence strength is clamped between 0 and 100', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')

    // Large buy sizes should push toward max
    const hugeBuys: GmgnSmartMoneyTrade[] = Array.from({ length: 10 }, (_, i) =>
      makeSmTrade({
        wallet_address: `wallet${i}`,
        token_address: 'tokenSTR',
        side: 'buy',
        value_usd: 100000, // very large trade
      })
    )
    const byToken = tracker.groupByToken([], hugeBuys, NOW_SEC - 15 * 60)
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.strength).toBeGreaterThanOrEqual(0)
    expect(alerts[0]?.strength).toBeLessThanOrEqual(100)
  })

  it('convergence strength increases with more wallets', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')

    const twoWallets = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'w1', token_address: 'tkA', value_usd: 1000 }),
        makeSmTrade({ wallet_address: 'w2', token_address: 'tkA', value_usd: 1000 }),
      ],
      NOW_SEC - 15 * 60
    )
    const threeWallets = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'w1', token_address: 'tkB', value_usd: 1000 }),
        makeSmTrade({ wallet_address: 'w2', token_address: 'tkB', value_usd: 1000 }),
        makeSmTrade({ wallet_address: 'w3', token_address: 'tkB', value_usd: 1000 }),
      ],
      NOW_SEC - 15 * 60
    )

    const alertsTwo = tracker.detectConvergence(twoWallets, NOW_SEC)
    const alertsThree = tracker.detectConvergence(threeWallets, NOW_SEC)

    const strengthTwo = alertsTwo[0]?.strength ?? 0
    const strengthThree = alertsThree[0]?.strength ?? 0

    expect(strengthThree).toBeGreaterThan(strengthTwo)
  })

  it('strength is exactly 0 floor — never negative', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'w1', value_usd: 0 }),
        makeSmTrade({ wallet_address: 'w2', value_usd: 0 }),
      ],
      NOW_SEC - 15 * 60
    )
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)

    expect(alerts[0]?.strength).toBeGreaterThanOrEqual(0)
  })
})

describe('SmartMoneyTracker - window filtering', () => {
  it('excludes trades older than the 15min window', () => {
    const tracker = new SmartMoneyTracker(makeClient(), 'sol')
    const oldTimestamp = NOW_SEC - 20 * 60 // 20 minutes ago — outside window

    const byToken = tracker.groupByToken(
      [],
      [
        makeSmTrade({ wallet_address: 'wallet1', timestamp: oldTimestamp }),
        makeSmTrade({ wallet_address: 'wallet2', timestamp: oldTimestamp }),
      ],
      NOW_SEC - 15 * 60
    )

    expect(byToken.size).toBe(0)
    const alerts = tracker.detectConvergence(byToken, NOW_SEC)
    expect(alerts).toHaveLength(0)
  })
})
