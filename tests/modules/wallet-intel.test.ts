import { describe, expect, it } from "vitest";
import type { GmgnWalletHolding, GmgnWalletStats } from "../../src/foundation/api-types.js";
import { calculateWalletScore } from "../../src/modules/wallet-intel.js";

function makeStats(overrides: Partial<GmgnWalletStats> = {}): GmgnWalletStats {
  const base: GmgnWalletStats = {
    address: "So11111111111111111111111111111111111111112",
    win_rate: 0.5,
    avg_roi: 0,
    total_cost: 1000,
    realized_profit: 0,
    unrealized_profit: 0,
    buy_count: 10,
    sell_count: 8,
  };
  return { ...base, ...overrides };
}

function makeHolding(overrides: Partial<GmgnWalletHolding> = {}): GmgnWalletHolding {
  const base: GmgnWalletHolding = {
    token_address: "So11111111111111111111111111111111111111112",
    symbol: "TEST",
    name: "Test Token",
    balance: 1000,
    value_usd: 100,
    price: 0.1,
    cost_basis: 80,
  };
  return { ...base, ...overrides };
}

describe("calculateWalletScore", () => {
  it("produces a high score for good stats (high winrate, positive PnL)", () => {
    const stats = makeStats({
      win_rate: 0.85,
      total_cost: 10000,
      realized_profit: 25000,
      unrealized_profit: 5000,
      buy_count: 50,
      sell_count: 45,
      active_since: Math.floor(Date.now() / 1000) - 200 * 86400, // 200 days old
      tags: ["smart_money"],
    });
    const holdings = [
      makeHolding({ cost_basis: 500 }),
      makeHolding({ cost_basis: 600 }),
      makeHolding({ cost_basis: 550 }),
    ];
    const score = calculateWalletScore(stats, holdings);
    expect(score).toBeGreaterThan(70);
  });

  it("produces a low score for bad stats (low winrate, negative PnL)", () => {
    const stats = makeStats({
      win_rate: 0.15,
      total_cost: 10000,
      realized_profit: -8000,
      unrealized_profit: -1000,
      buy_count: 30,
      sell_count: 25,
      active_since: Math.floor(Date.now() / 1000) - 5 * 86400, // 5 days old
      tags: [],
    });
    const holdings = [makeHolding({ cost_basis: 5000 })]; // over-concentrated
    const score = calculateWalletScore(stats, holdings);
    expect(score).toBeLessThan(40);
  });

  it("does not crash with missing/null fields and produces a neutral score (~50)", () => {
    const minimal: GmgnWalletStats = {
      address: "So11111111111111111111111111111111111111112",
      win_rate: 0,
      avg_roi: 0,
      total_cost: 0,
      realized_profit: 0,
      unrealized_profit: 0,
      buy_count: 0,
      sell_count: 0,
    };
    const score = calculateWalletScore(minimal, []);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    // With all neutral/missing inputs the score should be near 50
    expect(score).toBeGreaterThan(30);
    expect(score).toBeLessThan(70);
  });

  it("handles undefined optional fields without throwing", () => {
    const stats = makeStats({
      win_rate: undefined as unknown as number,
      active_since: undefined,
      tags: undefined,
    });
    expect(() => calculateWalletScore(stats, [])).not.toThrow();
  });

  it("always clamps score to 0-100", () => {
    // Extreme positive
    const great = makeStats({
      win_rate: 2.0, // impossibly high
      total_cost: 100,
      realized_profit: 1_000_000,
      unrealized_profit: 1_000_000,
      buy_count: 999,
      sell_count: 999,
      active_since: 0, // very old
      tags: ["smart_money", "renowned", "kol"],
    });
    expect(calculateWalletScore(great, [])).toBeLessThanOrEqual(100);

    // Extreme negative
    const terrible = makeStats({
      win_rate: -1.0, // impossibly low
      total_cost: 100,
      realized_profit: -1_000_000,
      unrealized_profit: -1_000_000,
      buy_count: 999,
      sell_count: 999,
    });
    expect(calculateWalletScore(terrible, [])).toBeGreaterThanOrEqual(0);
  });

  it("score improves with longer wallet history", () => {
    const youngStats = makeStats({
      active_since: Math.floor(Date.now() / 1000) - 3 * 86400,
    });
    const oldStats = makeStats({
      active_since: Math.floor(Date.now() / 1000) - 200 * 86400,
    });
    const youngScore = calculateWalletScore(youngStats, []);
    const oldScore = calculateWalletScore(oldStats, []);
    expect(oldScore).toBeGreaterThan(youngScore);
  });

  it("smart_money tag increases score over no tags", () => {
    const tagged = makeStats({ tags: ["smart_money"] });
    const plain = makeStats({ tags: [] });
    expect(calculateWalletScore(tagged, [])).toBeGreaterThan(calculateWalletScore(plain, []));
  });
});
