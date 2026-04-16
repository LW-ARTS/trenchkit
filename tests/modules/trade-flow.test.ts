import { describe, it, expect, vi } from 'vitest'
import {
  buildConditionOrders,
  buildSwapRequest,
  enforceMaxAmount,
  executeTrade,
  MaxTradeAmountExceeded,
  pollOrder,
} from '../../src/modules/trade-flow.js'
import { AuthTimestampExpiredError } from '../../src/foundation/api/client.js'
import type { GmgnClient } from '../../src/foundation/api/client.js'
import type { TrenchkitConfig } from '../../src/foundation/config.js'
import type { TradeIntent } from '../../src/modules/trade-flow.js'
import type { GmgnSwapResponse } from '../../src/foundation/api-types.js'

const SOL_NATIVE = 'So11111111111111111111111111111111111111112'
const BASE_NATIVE = '0x4200000000000000000000000000000000000006'

const baseConfig: TrenchkitConfig = {
  defaultChain: 'sol',
  maxTradeAmount: 1,
  defaultPriorityFee: 0.00001,
  defaultTipFee: 0.00001,
}

function makeClient(trade: Partial<GmgnClient['trade']> = {}): GmgnClient {
  return {
    token: {} as GmgnClient['token'],
    market: {} as GmgnClient['market'],
    user: {} as GmgnClient['user'],
    trade: {
      getQuote: vi.fn(),
      submitSwap: vi.fn(),
      getOrderStatus: vi.fn(),
      getStrategyOrders: vi.fn(),
      ...trade,
    } as GmgnClient['trade'],
  }
}

function buyIntent(overrides: Partial<TradeIntent> = {}): TradeIntent {
  return {
    chain: 'sol',
    walletAddress: '11111111111111111111111111111111',
    inputToken: SOL_NATIVE,
    outputToken: 'TOKEN',
    amount: '0.5',
    slippage: 0.02,
    ...overrides,
  }
}

describe('buildConditionOrders', () => {
  it('produces profit_stop for tpPct', () => {
    const orders = buildConditionOrders({ tpPct: 150 })
    expect(orders).toEqual([{ type: 'profit_stop', mode: 'hold_amount', price_scale: 150 }])
  })

  it('produces loss_stop for slPct', () => {
    const orders = buildConditionOrders({ slPct: 30 })
    expect(orders).toEqual([{ type: 'loss_stop', mode: 'hold_amount', price_scale: 30 }])
  })

  it('produces trailing TP with drawdown_rate', () => {
    const orders = buildConditionOrders({ trailTp: { activationPct: 150, callbackPct: 10 } })
    expect(orders).toEqual([
      { type: 'profit_stop_trace', mode: 'hold_amount', price_scale: 150, drawdown_rate: 10 },
    ])
  })

  it('combines multiple variants in one list', () => {
    const orders = buildConditionOrders({ tpPct: 150, slPct: 30 })
    expect(orders).toHaveLength(2)
    expect(orders[0]?.type).toBe('profit_stop')
    expect(orders[1]?.type).toBe('loss_stop')
  })
})

describe('buildSwapRequest', () => {
  it('omits condition_orders and fees when no TP/SL', () => {
    const req = buildSwapRequest(buyIntent(), baseConfig)
    expect(req.condition_orders).toBeUndefined()
    expect(req.priority_fee).toBeUndefined()
    expect(req.tip_fee).toBeUndefined()
  })

  it('auto-injects SOL priority_fee and tip_fee when TP/SL attached', () => {
    const req = buildSwapRequest(buyIntent({ tpSl: { tpPct: 150 } }), baseConfig)
    expect(req.priority_fee).toBe(0.00001)
    expect(req.tip_fee).toBe(0.00001)
    expect(req.condition_orders).toHaveLength(1)
  })

  it('honors user-provided priority_fee/tip_fee override', () => {
    const req = buildSwapRequest(
      buyIntent({ tpSl: { tpPct: 150 }, priorityFee: 0.005, tipFee: 0.003 }),
      baseConfig
    )
    expect(req.priority_fee).toBe(0.005)
    expect(req.tip_fee).toBe(0.003)
  })

  it('does NOT inject fees on Base chain', () => {
    const req = buildSwapRequest(
      buyIntent({ chain: 'base', inputToken: BASE_NATIVE, tpSl: { tpPct: 150 } }),
      baseConfig
    )
    expect(req.priority_fee).toBeUndefined()
    expect(req.tip_fee).toBeUndefined()
    expect(req.condition_orders).toHaveLength(1)
  })
})

describe('enforceMaxAmount', () => {
  it('throws on buy over cap', () => {
    expect(() => enforceMaxAmount(buyIntent({ amount: '2' }), 1)).toThrow(MaxTradeAmountExceeded)
  })

  it('allows buy at exactly cap', () => {
    expect(() => enforceMaxAmount(buyIntent({ amount: '1' }), 1)).not.toThrow()
  })

  it('does not cap sells (input is not native)', () => {
    const sell = buyIntent({ inputToken: 'TOKEN', outputToken: SOL_NATIVE, amount: '999999' })
    expect(() => enforceMaxAmount(sell, 1)).not.toThrow()
  })
})

describe('executeTrade', () => {
  it('enforces cap BEFORE quote when --yes bypasses confirmation', async () => {
    const client = makeClient()
    await expect(
      executeTrade(client, buyIntent({ amount: '5' }), baseConfig, { yes: true })
    ).rejects.toBeInstanceOf(MaxTradeAmountExceeded)
    expect(client.trade.getQuote).not.toHaveBeenCalled()
    expect(client.trade.submitSwap).not.toHaveBeenCalled()
  })

  it('surfaces no-retry guidance on AUTH_TIMESTAMP_EXPIRED, never retries POST', async () => {
    const submitSwap = vi
      .fn<GmgnClient['trade']['submitSwap']>()
      .mockRejectedValue(new AuthTimestampExpiredError('HTTP 401 AUTH_TIMESTAMP_EXPIRED'))
    const client = makeClient({
      getQuote: vi.fn().mockResolvedValue({
        input_token: SOL_NATIVE,
        output_token: 'TOKEN',
        input_amount: 0.5,
        output_amount: 142_000,
        price_impact: 0.01,
        fee: 0,
      }),
      submitSwap,
    })
    await expect(
      executeTrade(client, buyIntent(), baseConfig, { yes: true })
    ).rejects.toThrow(/DO NOT retry/i)
    expect(submitSwap).toHaveBeenCalledTimes(1)
  })

  it('polls until confirmed then returns status', async () => {
    const getOrderStatus = vi
      .fn<GmgnClient['trade']['getOrderStatus']>()
      .mockResolvedValueOnce({ order_id: 'o1', status: 'pending' })
      .mockResolvedValueOnce({ order_id: 'o1', status: 'confirmed', tx_hash: '0xabc' })
    const client = makeClient({
      getQuote: vi.fn().mockResolvedValue({
        input_token: SOL_NATIVE,
        output_token: 'TOKEN',
        input_amount: 0.5,
        output_amount: 142_000,
        price_impact: 0.01,
        fee: 0,
      }),
      submitSwap: vi.fn().mockResolvedValue({ order_id: 'o1', status: 'pending' }),
      getOrderStatus,
    })
    const result = await executeTrade(client, buyIntent(), baseConfig, {
      yes: true,
      pollIntervalMs: 1,
      pollMaxMs: 1000,
    })
    expect(result.status).toBe('confirmed')
    expect(getOrderStatus).toHaveBeenCalledTimes(2)
  })
})

describe('pollOrder', () => {
  it('returns immediately on confirmed status', async () => {
    const client = makeClient({
      getOrderStatus: vi
        .fn<GmgnClient['trade']['getOrderStatus']>()
        .mockResolvedValue({ order_id: 'o1', status: 'confirmed' } as GmgnSwapResponse),
    })
    const status = await pollOrder(client, 'sol', 'o1', { intervalMs: 1, maxMs: 1000 })
    expect(status.status).toBe('confirmed')
  })

  it('times out if never confirms', async () => {
    const client = makeClient({
      getOrderStatus: vi
        .fn<GmgnClient['trade']['getOrderStatus']>()
        .mockResolvedValue({ order_id: 'o1', status: 'pending' } as GmgnSwapResponse),
    })
    await expect(
      pollOrder(client, 'sol', 'o1', { intervalMs: 1, maxMs: 5 })
    ).rejects.toThrow(/polling timed out/i)
  })
})
