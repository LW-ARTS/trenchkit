import type { GmgnClient } from '../foundation/api/client.js'
import type { GmgnRankItem } from '../foundation/api-types.js'
import type { Chain, TokenAnalysis } from '../foundation/types.js'
import { createEmptyTokenAnalysis } from '../foundation/types.js'
import { pipelineEvents } from '../foundation/events.js'
import { classifyLifecycleStage } from './scanner-lifecycle.js'

type TokenTrack = {
  address: string
  chain: Chain
  firstSeen: number
  scanCount: number
  lastData: GmgnRankItem
  holderHistory: number[]    // holder_count per scan for growth calc
  liquidityHistory: number[] // liquidity per scan for stability
}

const MIN_SCANS = 8
const HARD_FILTERS = {
  maxRugRatio: 0.5,
  // bot_degen_rate and is_wash_trading are not available on GmgnRankItem at scan time;
  // those filters would apply if enrichment data were provided via token detail endpoints.
  maxAge: 6 * 3600,   // 6 hours in seconds
  minAge: 180,         // 3 minutes
  minHolderCount: 100,
  minLiquidity: 5000,  // $5k, skipped for bonding curve tokens
} as const

export class Scanner {
  private tracker = new Map<string, TokenTrack>()
  private client: GmgnClient
  private chain: Chain

  constructor(client: GmgnClient, chain: Chain) {
    this.client = client
    this.chain = chain
  }

  async pollTrending(): Promise<TokenAnalysis[]> {
    const items = await this.client.market.getTrending(this.chain, { limit: 50, period: '5m' })
    return this.processItems(items)
  }

  async pollTrenches(): Promise<TokenAnalysis[]> {
    const data = await this.client.market.getTrenches(this.chain, {
      limit: 80,
      filters: { sort_by: 'smart_degen_count' },
    })
    return this.processItems(data.items)
  }

  private processItems(items: GmgnRankItem[]): TokenAnalysis[] {
    const qualified: TokenAnalysis[] = []
    const now = Math.floor(Date.now() / 1000)

    for (const item of items) {
      const key = `${this.chain}:${item.address}`
      let track = this.tracker.get(key)

      if (!track) {
        track = {
          address: item.address,
          chain: this.chain,
          firstSeen: now,
          scanCount: 0,
          lastData: item,
          holderHistory: [],
          liquidityHistory: [],
        }
        this.tracker.set(key, track)
      }

      track.scanCount++
      track.lastData = item
      track.holderHistory.push(item.holder_count ?? 0)
      track.liquidityHistory.push(item.liquidity ?? 0)

      // Keep only last 20 data points
      if (track.holderHistory.length > 20) track.holderHistory.shift()
      if (track.liquidityHistory.length > 20) track.liquidityHistory.shift()

      if (track.scanCount < MIN_SCANS) continue
      if (!this.passesHardFilters(item)) continue

      const analysis = this.mapToAnalysis(track)
      qualified.push(analysis)

      pipelineEvents.emit('scan:qualified', {
        tokenAddress: item.address,
        chain: this.chain,
      })
    }

    return qualified
  }

  private passesHardFilters(item: GmgnRankItem): boolean {
    if ((item.rug_ratio ?? 0) > HARD_FILTERS.maxRugRatio) return false
    if ((item.holder_count ?? 0) < HARD_FILTERS.minHolderCount) return false

    const age = item.created_at
      ? Math.floor(Date.now() / 1000) - item.created_at
      : null
    if (age !== null) {
      if (age < HARD_FILTERS.minAge || age > HARD_FILTERS.maxAge) return false
    }

    // Liquidity filter: skip for bonding curve tokens (on launchpad without 1h price data)
    const isOnCurve = item.launchpad !== undefined && item.price_change_1h === undefined
    if (!isOnCurve && (item.liquidity ?? 0) < HARD_FILTERS.minLiquidity) return false

    return true
  }

  private mapToAnalysis(track: TokenTrack): TokenAnalysis {
    const item = track.lastData
    const analysis = createEmptyTokenAnalysis(item.address, this.chain)
    const now = Math.floor(Date.now() / 1000)

    analysis.symbol = item.symbol ?? null
    analysis.name = item.name ?? null
    analysis.marketCap = item.market_cap ?? null
    analysis.liquidity = item.liquidity ?? null
    analysis.holderCount = item.holder_count ?? null
    analysis.volume24h = item.volume_24h ?? null
    analysis.age = item.created_at ? now - item.created_at : null
    analysis.priceChange5m = item.price_change_5m ?? null
    analysis.rugRatio = item.rug_ratio ?? null
    // Fields below require token detail enrichment (not available on GmgnRankItem):
    // botDegenRate, bundlerRate, isWashTrading, ratTraderRate, sniperCount,
    // top10HolderRate, freshWalletRate, smartMoneyWalletCount — all remain null

    // Holder growth rate (last 3 scans)
    if (track.holderHistory.length >= 3) {
      const recent = track.holderHistory[track.holderHistory.length - 1]
      const earlier = track.holderHistory[track.holderHistory.length - 3]
      if (recent !== undefined && earlier !== undefined) {
        analysis.holderGrowthRate = earlier > 0 ? (recent - earlier) / earlier : null
      }
    }

    // Liquidity stability
    if (track.liquidityHistory.length >= 3) {
      const recent = track.liquidityHistory[track.liquidityHistory.length - 1]
      const earlier = track.liquidityHistory[track.liquidityHistory.length - 3]
      if (recent !== undefined && earlier !== undefined) {
        analysis.liquidityStable = earlier > 0 ? (earlier - recent) / earlier < 0.2 : null
      }
    }

    // Lifecycle stage
    analysis.lifecycleStage = classifyLifecycleStage(item, track.holderHistory)

    return analysis
  }

  getTrackedCount(): number {
    return this.tracker.size
  }

  clearStale(maxAgeSec = 7200): void {
    const now = Math.floor(Date.now() / 1000)
    for (const [key, track] of this.tracker) {
      if (now - track.firstSeen > maxAgeSec) {
        this.tracker.delete(key)
      }
    }
  }
}
