import type { GmgnClient } from "../foundation/api/client.js";
import type { GmgnSmartMoneyTrade } from "../foundation/api-types.js";
import { pipelineEvents } from "../foundation/events.js";
import type { Chain, SignalStrength } from "../foundation/types.js";

export type NormalizedTrade = {
  maker: string;
  makerName: string | null;
  side: "buy" | "sell";
  amountUsd: number;
  isFullOpen: boolean;
  timestamp: number;
  source: "kol" | "smartmoney";
};

export type ConvergenceAlert = {
  tokenAddress: string;
  chain: Chain;
  walletCount: number;
  trades: NormalizedTrade[];
  strength: number;
  signalLevel: SignalStrength;
  isDivergence: boolean;
  detectedAt: number;
};

// 15 minute convergence window in seconds
const CONVERGENCE_WINDOW_SEC = 15 * 60;

const MAX_RECENT_TRADES = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// For kol/smartmoney endpoints: 0 = position opened/added, 1 = position closed/reduced
// Returns true when trade is an opening (is_open_or_close === 0)
function normalizeIsOpenOrClose(rawValue: number | undefined): boolean {
  if (rawValue === undefined) return false;
  return rawValue === 0;
}

function normalizeTrade(raw: GmgnSmartMoneyTrade, source: "kol" | "smartmoney"): NormalizedTrade {
  return {
    maker: raw.wallet_address,
    makerName: null,
    side: raw.side,
    amountUsd: raw.value_usd,
    isFullOpen: normalizeIsOpenOrClose(raw.is_open_or_close),
    timestamp: raw.timestamp,
    source,
  };
}

function classifySignalStrength(
  walletCount: number,
  trades: NormalizedTrade[],
  windowStartSec: number,
): SignalStrength {
  const kolBuys = trades.filter((t) => t.source === "kol" && t.side === "buy");
  const smBuys = trades.filter((t) => t.source === "smartmoney" && t.side === "buy");
  const hasFullOpen = trades.some((t) => t.isFullOpen && t.side === "buy");

  // VERY_STRONG: cluster of SM + full opens + KOL involvement
  if (kolBuys.length >= 1 && smBuys.length >= 2 && hasFullOpen) {
    return "VERY_STRONG";
  }

  // STRONG: >= 3 SM buys in 30min OR >= 3 distinct wallet buyers
  const thirtyMinStart = windowStartSec - 30 * 60;
  const recentSmBuys = smBuys.filter((t) => t.timestamp >= thirtyMinStart);
  if (recentSmBuys.length >= 3 || walletCount >= 3) {
    return "STRONG";
  }

  // MEDIUM: 2-3 SM wallets OR 1 full open
  if (smBuys.length >= 2 || hasFullOpen) {
    return "MEDIUM";
  }

  // WEAK: 1 KOL buying
  if (kolBuys.length >= 1) {
    return "WEAK";
  }

  return "WEAK";
}

function computeConvergenceStrength(walletCount: number, relativeVolume: number): number {
  // clamp((walletCount * 30 * relativeVolume) / 3, 0, 100)
  // 30 is avg score estimate since individual wallet scores aren't available at poll time
  return clamp((walletCount * 30 * relativeVolume) / 3, 0, 100);
}

// Intermediate type used internally to keep token address alongside normalized trade
type TaggedTrade = {
  trade: NormalizedTrade;
  tokenAddress: string;
};

export class SmartMoneyTracker {
  private client: GmgnClient;
  private chain: Chain;
  private recentTrades: NormalizedTrade[] = [];

  constructor(client: GmgnClient, chain: Chain) {
    this.client = client;
    this.chain = chain;
  }

  async poll(): Promise<ConvergenceAlert[]> {
    const [kolRaw, smRaw] = await Promise.all([
      this.client.user.getKolTrades(this.chain),
      this.client.user.getSmartMoneyTrades(this.chain),
    ]);

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - CONVERGENCE_WINDOW_SEC;

    // Buffer normalized trades newest-first, capped at MAX_RECENT_TRADES.
    // Existing grouping/convergence logic below is unchanged — this is additive.
    const normalized: NormalizedTrade[] = [
      ...kolRaw.filter((r) => r.timestamp >= windowStart).map((r) => normalizeTrade(r, "kol")),
      ...smRaw
        .filter((r) => r.timestamp >= windowStart)
        .map((r) => normalizeTrade(r, "smartmoney")),
    ];
    normalized.sort((a, b) => b.timestamp - a.timestamp);
    this.recentTrades = normalized.slice(0, MAX_RECENT_TRADES);

    const byToken = this.groupByToken(kolRaw, smRaw, windowStart);
    return this.detectConvergence(byToken, now);
  }

  // Additive accessor — no contract change to poll().
  getRecentTrades(): NormalizedTrade[] {
    return [...this.recentTrades]; // defensive copy
  }

  // Exposed for unit testing: groups raw trades by token within the 15min window
  groupByToken(
    kolRaw: GmgnSmartMoneyTrade[],
    smRaw: GmgnSmartMoneyTrade[],
    windowStart: number,
  ): Map<string, TaggedTrade[]> {
    const byToken = new Map<string, TaggedTrade[]>();

    const addTrades = (raws: GmgnSmartMoneyTrade[], source: "kol" | "smartmoney") => {
      for (const raw of raws) {
        if (raw.timestamp < windowStart) continue;
        const normalized = normalizeTrade(raw, source);
        const existing = byToken.get(raw.token_address);
        if (existing !== undefined) {
          existing.push({ trade: normalized, tokenAddress: raw.token_address });
        } else {
          byToken.set(raw.token_address, [{ trade: normalized, tokenAddress: raw.token_address }]);
        }
      }
    };

    addTrades(kolRaw, "kol");
    addTrades(smRaw, "smartmoney");

    return byToken;
  }

  // Exposed for unit testing: produces alerts from a pre-grouped map
  detectConvergence(byToken: Map<string, TaggedTrade[]>, now: number): ConvergenceAlert[] {
    const alerts: ConvergenceAlert[] = [];

    for (const [tokenAddress, entries] of byToken) {
      const tradesInWindow = entries.map((e) => e.trade);

      // Count distinct buying wallets
      const buyingWallets = new Set<string>();
      for (const t of tradesInWindow) {
        if (t.side === "buy") buyingWallets.add(t.maker);
      }

      // Need at least 2 distinct wallets buying the same token to trigger convergence
      if (buyingWallets.size < 2) continue;

      const walletCount = buyingWallets.size;
      const windowStartSec = now - CONVERGENCE_WINDOW_SEC;
      const signalLevel = classifySignalStrength(walletCount, tradesInWindow, windowStartSec);

      // Divergence: KOL buying + SM selling same token in the window
      const kolBuyers = tradesInWindow.filter((t) => t.source === "kol" && t.side === "buy");
      const smSellers = tradesInWindow.filter(
        (t) => t.source === "smartmoney" && t.side === "sell",
      );
      const isDivergence = kolBuyers.length > 0 && smSellers.length > 0;

      // Relative volume: avg trade size normalized against $1000 baseline, capped at 3x
      const totalVolumeUsd = tradesInWindow.reduce((sum, t) => sum + t.amountUsd, 0);
      const avgTradeUsd = tradesInWindow.length > 0 ? totalVolumeUsd / tradesInWindow.length : 0;
      const relativeVolume = avgTradeUsd > 0 ? Math.min(avgTradeUsd / 1000, 3) : 1;

      const strength = computeConvergenceStrength(walletCount, relativeVolume);

      const alert: ConvergenceAlert = {
        tokenAddress,
        chain: this.chain,
        walletCount,
        trades: tradesInWindow,
        strength,
        signalLevel,
        isDivergence,
        detectedAt: now,
      };

      alerts.push(alert);

      // Emit event only for STRONG and VERY_STRONG signals
      if (signalLevel === "STRONG" || signalLevel === "VERY_STRONG") {
        pipelineEvents.emit("convergence:detected", {
          tokenAddress,
          chain: this.chain,
          strength,
        });
      }
    }

    return alerts;
  }
}
