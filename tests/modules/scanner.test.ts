import { describe, expect, it } from "vitest";
import type { GmgnRankItem } from "../../src/foundation/api-types.js";
import { classifyLifecycleStage } from "../../src/modules/scanner-lifecycle.js";

function makeRankItem(overrides: Partial<GmgnRankItem> = {}): GmgnRankItem {
  // Only include required fields in base; optional fields come from overrides
  const base: GmgnRankItem = {
    address: "So11111111111111111111111111111111111111112",
    symbol: "TEST",
    name: "Test Token",
    price: 0.001,
    market_cap: 100000,
    liquidity: 50000,
    holder_count: 200,
    volume_24h: 10000,
  };
  return { ...base, ...overrides };
}

describe("Scanner Lifecycle", () => {
  it("classifies EARLY for young token with no significant price movement", () => {
    const item = makeRankItem({
      created_at: Math.floor(Date.now() / 1000) - 600, // 10min old
      price_change_1h: 5,
    });
    expect(classifyLifecycleStage(item, [100, 120, 150])).toBe("EARLY");
  });

  it("classifies BREAKOUT for tokens with strong price action", () => {
    const item = makeRankItem({
      created_at: Math.floor(Date.now() / 1000) - 7200, // 2h old (past EARLY age gate)
      price_change_1h: 50,
    });
    expect(classifyLifecycleStage(item, [100, 150, 200])).toBe("BREAKOUT");
  });

  it("classifies DISTRIBUTION when launchpad completed with declining price", () => {
    const item = makeRankItem({
      launchpad: "Pump.fun",
      launchpad_status: "completed",
      price_change_1h: -10,
      created_at: Math.floor(Date.now() / 1000) - 7200,
    });
    expect(classifyLifecycleStage(item, [200, 250, 260])).toBe("DISTRIBUTION");
  });

  it("classifies DECLINE when holders dropping and rug ratio high", () => {
    const item = makeRankItem({
      rug_ratio: 0.5,
      created_at: Math.floor(Date.now() / 1000) - 3600,
    });
    expect(classifyLifecycleStage(item, [300, 280, 250])).toBe("DECLINE");
  });
});
