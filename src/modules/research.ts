import type { GmgnClient } from '../foundation/api/client.js'
import type {
  GmgnTokenInfo,
  GmgnTokenSecurity,
  GmgnHolder,
  GmgnCreatedTokens,
  GmgnKlineCandle,
} from '../foundation/api-types.js'
import type { Chain, TokenAnalysis } from '../foundation/types.js'
import { createEmptyTokenAnalysis } from '../foundation/types.js'

export class ResearchEngine {
  private client: GmgnClient
  private chain: Chain

  constructor(client: GmgnClient, chain: Chain) {
    this.client = client
    this.chain = chain
  }

  async research(tokenAddress: string): Promise<TokenAnalysis> {
    const analysis = createEmptyTokenAnalysis(tokenAddress, this.chain)

    // ── Endpoint 1: Token Info (weight 1) ─────────────────────────────
    let info: GmgnTokenInfo | null = null
    try {
      info = await this.client.token.getInfo(this.chain, tokenAddress)
      this.mapTokenInfo(info, analysis)
    } catch {
      analysis.partialData = true
    }

    // ── Endpoint 2: Token Security (weight 1) ──────────────────────────
    try {
      const security = await this.client.token.getSecurity(this.chain, tokenAddress)
      this.mapSecurity(security, analysis)
    } catch {
      analysis.partialData = true
    }

    // ── Endpoint 3: Pool Info (weight 1) ───────────────────────────────
    try {
      const pool = await this.client.token.getPool(this.chain, tokenAddress)
      // Pool liquidity supplements info.liquidity if not already set
      if (analysis.liquidity === null && pool.liquidity != null) {
        analysis.liquidity = pool.liquidity
      }
    } catch {
      analysis.partialData = true
    }

    // ── Endpoint 4: Market Kline (weight 2) ────────────────────────────
    try {
      const candles = await this.client.market.getKline(this.chain, tokenAddress, {
        resolution: '15m',
        limit: 48,
      })
      this.mapKlineStability(candles, analysis)
    } catch {
      analysis.partialData = true
    }

    // ── Endpoint 5: Top Holders (weight 5) ─────────────────────────────
    try {
      const holders = await this.client.token.getTopHolders(this.chain, tokenAddress, {
        limit: 20,
      })
      this.mapHolders(holders, analysis)
    } catch {
      analysis.partialData = true
    }

    // ── Endpoint 6: Top Traders (weight 5) ─────────────────────────────
    // Top traders data is fetched for pipeline completeness; the response
    // fields don't map directly to TokenAnalysis scalar fields.
    try {
      await this.client.token.getTopTraders(this.chain, tokenAddress, { limit: 20 })
    } catch {
      analysis.partialData = true
    }

    // ── Endpoint 7: Dev History via Created Tokens (weight 2) ──────────
    // Requires dev address from endpoint 1; skip gracefully if unavailable
    const devAddress = info?.dev?.address
    if (devAddress != null) {
      try {
        const created = await this.client.user.getCreatedTokens(this.chain, devAddress)
        this.mapDevHistory(created, analysis)
      } catch {
        analysis.partialData = true
      }
    } else if (info !== null) {
      // Info loaded but no dev address — not an error, just absent
    } else {
      // Info itself failed — already marked partialData above
    }

    return analysis
  }

  mapTokenInfo(info: GmgnTokenInfo, analysis: TokenAnalysis): void {
    analysis.symbol = info.symbol ?? null
    analysis.name = info.name ?? null
    analysis.liquidity = info.liquidity ?? null
    analysis.holderCount = info.holder_count ?? null

    // market_cap = price * circulating_supply (not returned directly)
    if (
      typeof info.price === 'number' &&
      typeof info.circulating_supply === 'number' &&
      Number.isFinite(info.price) &&
      Number.isFinite(info.circulating_supply)
    ) {
      analysis.marketCap = info.price * info.circulating_supply
    }

    // Age in seconds since creation
    if (typeof info.creation_timestamp === 'number' && info.creation_timestamp > 0) {
      analysis.age = Math.floor(Date.now() / 1000) - info.creation_timestamp
    }

    // Launchpad / bonding curve status
    // launchpad_status is typed as string; '1' means on-curve
    analysis.isOnCurve = info.launchpad_status === '1'
    analysis.launchpadProgress = info.launchpad_progress ?? null

    // Stat fields nested under info.stat
    if (info.stat != null) {
      analysis.volume24h = info.stat.volume_24h ?? null
      analysis.priceChange5m = info.stat.price_change_5m ?? null
      analysis.holderGrowthRate = info.stat.holder_growth_rate ?? null
      analysis.freshWalletRate = info.stat.fresh_wallet_rate ?? null
      analysis.smartMoneyWalletCount = info.stat.smart_money_wallet_count ?? null
      analysis.smartMoneyVolumeRatio = info.stat.smart_money_volume_ratio ?? null
      analysis.bluechipOwnerPercentage = info.stat.bluechip_owner_percentage ?? null
    }

    // Wallet tag stat fields nested under info.wallet_tags_stat
    if (info.wallet_tags_stat != null) {
      analysis.botDegenRate = info.wallet_tags_stat.bot_degen ?? null
      analysis.sniperCount = info.wallet_tags_stat.sniper ?? null
    }

    // Dev fields nested under info.dev
    if (info.dev != null) {
      analysis.creatorOpenCount = info.dev.created_open_count ?? null
      analysis.creatorInnerCount = info.dev.created_inner_count ?? null
      analysis.creatorOpenRatio = info.dev.created_open_ratio ?? null
      analysis.devAthMc = info.dev.ath_mc ?? null
    }
  }

  mapSecurity(security: GmgnTokenSecurity, analysis: TokenAnalysis): void {
    // SOL-specific renounced flags
    analysis.isFreezeAuthorityRenounced = security.renounced_freeze_account ?? null
    analysis.isMintAuthorityRenounced = security.renounced_mint ?? null

    // Generic renounced (covers EVM owner_renounced)
    analysis.isRenounced = security.owner_renounced ?? null

    // EVM-only honeypot — is_honeypot is boolean in the type
    analysis.isHoneypot = security.is_honeypot ?? null

    // Tax fields
    analysis.buyTax = security.buy_tax ?? null
    analysis.sellTax = security.sell_tax ?? null

    // Risk metrics
    analysis.rugRatio = security.rug_ratio ?? null
    analysis.isWashTrading = security.is_wash_trading ?? null
    analysis.ratTraderRate = security.rat_trader_amount_rate ?? null
    analysis.bundlerRate = security.bundler_trader_amount_rate ?? null
    analysis.sniperCount = security.sniper_count ?? analysis.sniperCount

    // Top-10 holder concentration
    if (security.top_10_holder_rate != null) {
      analysis.top10HolderRate = security.top_10_holder_rate
    }

    // Insider hold rate from suspected_insider_hold_rate
    analysis.insiderHoldRate = security.suspected_insider_hold_rate ?? null
  }

  mapHolders(holders: GmgnHolder[], analysis: TokenAnalysis): void {
    if (holders.length === 0) return

    // Count locked holders as a proxy for private vault rate
    const lockedCount = holders.filter((h) => h.is_locked === true).length
    analysis.privateVaultHoldRate =
      holders.length > 0 ? lockedCount / holders.length : null
  }

  mapDevHistory(created: GmgnCreatedTokens, analysis: TokenAnalysis): void {
    if (!created.tokens || created.tokens.length === 0) return

    // Derive devAthMc from max ath_mc across all created tokens (override/supplement info.dev)
    const athValues = created.tokens
      .map((t) => t.ath_mc)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))

    if (athValues.length > 0) {
      const maxAth = Math.max(...athValues)
      // Only override if we didn't already get a value from info.dev
      if (analysis.devAthMc === null) {
        analysis.devAthMc = maxAth
      }
    }
  }

  mapKlineStability(candles: GmgnKlineCandle[], analysis: TokenAnalysis): void {
    if (candles.length < 4) {
      analysis.liquidityStable = null
      return
    }

    // Compute coefficient of variation on closing prices
    const closes = candles.map((c) => c.close).filter((v) => Number.isFinite(v) && v > 0)
    if (closes.length < 4) {
      analysis.liquidityStable = null
      return
    }

    const mean = closes.reduce((sum, v) => sum + v, 0) / closes.length
    if (mean === 0) {
      analysis.liquidityStable = false
      return
    }

    const variance = closes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / closes.length
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / mean

    // CV < 0.3 considered stable (less than 30% relative deviation)
    analysis.liquidityStable = cv < 0.3
  }
}
