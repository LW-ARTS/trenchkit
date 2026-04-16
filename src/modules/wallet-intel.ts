import type { GmgnClient } from '../foundation/api/client.js'
import type { GmgnWalletStats, GmgnWalletHolding } from '../foundation/api-types.js'
import type { Chain, WalletProfile } from '../foundation/types.js'

// Dimension weights (must sum to 1.0)
const WEIGHTS = {
  winRate: 0.30,
  pnlConsistency: 0.25,
  positionSizing: 0.15,
  ageAndHistory: 0.15,
  gmgnTags: 0.15,
} as const

/**
 * Score a wallet's win rate (0-1 fraction) to a 0-100 sub-score.
 * Linear mapping; a 0.5 win rate yields 50.
 */
function scoreWinRate(winRate: number | undefined): number {
  if (winRate == null || !Number.isFinite(winRate)) return 50
  return Math.min(100, Math.max(0, winRate * 100))
}

/**
 * Score PnL consistency based on total ROI weighted by trade count.
 * More trades reduce variance, so we use a confidence-adjusted score.
 */
function scorePnlConsistency(stats: GmgnWalletStats): number {
  const realized = stats.realized_profit ?? 0
  const unrealized = stats.unrealized_profit ?? 0
  const totalCost = stats.total_cost ?? 0
  const tradeCount = (stats.buy_count ?? 0) + (stats.sell_count ?? 0)

  if (totalCost <= 0) return 50

  const roi = (realized + unrealized) / totalCost
  // Raw ROI to 0-100: treat 0 as 50, +200% as 100, -100% as 0
  const rawScore = 50 + (roi / 2) * 50

  // Confidence factor: diminish score toward neutral when few trades
  const confidence = Math.min(1, tradeCount / 20)
  const adjusted = 50 + (rawScore - 50) * confidence

  return Math.min(100, Math.max(0, adjusted))
}

/**
 * Score position sizing discipline from holdings cost basis relative to total cost.
 * A healthy spread of positions (avg cost < 15% of total) scores high.
 */
function scorePositionSizing(stats: GmgnWalletStats, holdings: GmgnWalletHolding[]): number {
  const totalCost = stats.total_cost ?? 0
  if (totalCost <= 0 || holdings.length === 0) return 50

  const validCosts = holdings
    .map((h) => h.cost_basis)
    .filter((c): c is number => c != null && Number.isFinite(c) && c > 0)

  if (validCosts.length === 0) return 50

  const avgCost = validCosts.reduce((sum, c) => sum + c, 0) / validCosts.length
  const ratio = avgCost / totalCost

  // Ideal: avg position is ~5-10% of total (ratio 0.05-0.10)
  // Score 100 at ratio=0.075, falls off above 0.20 or below 0.02
  if (ratio <= 0) return 50
  if (ratio < 0.02) return 30
  if (ratio <= 0.10) return 60 + (ratio / 0.10) * 40
  if (ratio <= 0.20) return 100 - ((ratio - 0.10) / 0.10) * 40
  // Over-concentrated (>20% per position)
  return Math.max(0, 60 - ((ratio - 0.20) / 0.20) * 60)
}

/**
 * Score wallet age/history from active_since Unix timestamp.
 * More history up to ~180 days earns a higher score.
 */
function scoreAgeAndHistory(activeSince: number | undefined): number {
  if (activeSince == null || !Number.isFinite(activeSince) || activeSince <= 0) return 50

  const nowSec = Math.floor(Date.now() / 1000)
  const ageDays = (nowSec - activeSince) / 86400

  if (ageDays < 0) return 50
  if (ageDays < 7) return 20
  if (ageDays < 30) return 40 + (ageDays / 30) * 20
  if (ageDays < 90) return 60 + ((ageDays - 30) / 60) * 20
  if (ageDays < 180) return 80 + ((ageDays - 90) / 90) * 20
  return 100
}

/**
 * Score GMGN tags: bonus for prestigious labels.
 */
function scoreGmgnTags(tags: string[] | undefined): number {
  if (!tags || tags.length === 0) return 50

  let bonus = 0
  if (tags.includes('smart_money')) bonus += 30
  if (tags.includes('renowned')) bonus += 20
  if (tags.includes('kol')) bonus += 10

  return Math.min(100, 50 + bonus)
}

/**
 * Calculate the composite 5-dimension wallet score (0-100).
 * Exported for direct testing without needing a GmgnClient mock.
 */
export function calculateWalletScore(
  stats: GmgnWalletStats,
  holdings: GmgnWalletHolding[]
): number {
  const winRateScore = scoreWinRate(stats.win_rate)
  const pnlScore = scorePnlConsistency(stats)
  const positionScore = scorePositionSizing(stats, holdings)
  const ageScore = scoreAgeAndHistory(stats.active_since)
  const tagScore = scoreGmgnTags(stats.tags)

  const composite =
    winRateScore * WEIGHTS.winRate +
    pnlScore * WEIGHTS.pnlConsistency +
    positionScore * WEIGHTS.positionSizing +
    ageScore * WEIGHTS.ageAndHistory +
    tagScore * WEIGHTS.gmgnTags

  return Math.min(100, Math.max(0, Math.round(composite)))
}

export class WalletIntel {
  private client: GmgnClient
  private chain: Chain

  constructor(client: GmgnClient, chain: Chain) {
    this.client = client
    this.chain = chain
  }

  async getProfile(wallet: string): Promise<WalletProfile> {
    const [stats, holdings] = await Promise.all([
      this.client.user.getWalletStats(this.chain, wallet),
      this.client.user.getWalletHoldings(this.chain, wallet).catch((): GmgnWalletHolding[] => []),
    ])

    const walletScore = calculateWalletScore(stats, holdings)

    return {
      address: wallet,
      chain: this.chain,
      winRate: stats.win_rate ?? null,
      avgRoi: stats.avg_roi ?? null,
      style: stats.style ?? null,
      tags: stats.tags ?? null,
      riskLevel: stats.risk_level ?? null,
      activeSince: stats.active_since ?? null,
      totalCost: stats.total_cost ?? null,
      realizedProfit: stats.realized_profit ?? null,
      unrealizedProfit: stats.unrealized_profit ?? null,
      buyCount: stats.buy_count ?? null,
      sellCount: stats.sell_count ?? null,
      walletScore,
    }
  }
}
