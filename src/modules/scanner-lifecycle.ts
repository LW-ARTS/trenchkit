import type { GmgnRankItem } from "../foundation/api-types.js";
import type { LifecycleStage } from "../foundation/types.js";

export function classifyLifecycleStage(
  item: GmgnRankItem,
  holderHistory: number[],
): LifecycleStage {
  const now = Math.floor(Date.now() / 1000);
  const age = item.created_at ? now - item.created_at : 0;
  const priceChange1h = item.price_change_1h ?? 0;
  const rugRatio = item.rug_ratio ?? 0;

  // Decline: holders dropping + high rug ratio (best proxy without rat_trader_amount_rate)
  if (holderHistory.length >= 3) {
    const recent = holderHistory[holderHistory.length - 1];
    const earlier = holderHistory[holderHistory.length - 3];
    if (recent !== undefined && earlier !== undefined) {
      const holdersDropping = recent < earlier;
      // Use rug_ratio as risk proxy — smart_degen_count/rat_trader_rate not on GmgnRankItem
      if (holdersDropping && rugRatio > 0.3) return "DECLINE";
    }
  }

  // Early: young token with no significant price movement
  if (age < 3600 && priceChange1h <= 20) return "EARLY";

  // Distribution: launchpad completed status with declining momentum
  // Note: creator_token_status / renowned_count not available on GmgnRankItem at scan time.
  // Proxy: completed launchpad + price declining from recent peak
  if (item.launchpad_status === "completed" && priceChange1h < 0) return "DISTRIBUTION";

  // Breakout: strong price action in last hour
  if (priceChange1h > 20) return "BREAKOUT";

  // Default: tokens that survived >1h with filters are in growth mode
  if (age < 3600) return "EARLY";

  return "BREAKOUT";
}
