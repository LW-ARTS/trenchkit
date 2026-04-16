import { describe, expect, it, vi } from "vitest";
import type { GmgnClient } from "../../src/foundation/api/client.js";
import type {
  GmgnCreatedTokens,
  GmgnHolder,
  GmgnKlineCandle,
  GmgnTokenInfo,
  GmgnTokenSecurity,
} from "../../src/foundation/api-types.js";
import { createEmptyTokenAnalysis } from "../../src/foundation/types.js";
import { ResearchEngine } from "../../src/modules/research.js";

// ─── Minimal client stub ────────────────────────────────────────────────────

function makeClient(overrides: Partial<GmgnClient> = {}): GmgnClient {
  return {
    token: {
      getInfo: () => Promise.reject(new Error("not mocked")),
      getSecurity: () => Promise.reject(new Error("not mocked")),
      getPool: () => Promise.reject(new Error("not mocked")),
      getTopHolders: () => Promise.reject(new Error("not mocked")),
      getTopTraders: () => Promise.reject(new Error("not mocked")),
      ...(overrides.token ?? {}),
    },
    market: {
      getTrending: () => Promise.reject(new Error("not mocked")),
      getTrenches: () => Promise.reject(new Error("not mocked")),
      getKline: () => Promise.reject(new Error("not mocked")),
      ...(overrides.market ?? {}),
    },
    user: {
      getWalletStats: () => Promise.reject(new Error("not mocked")),
      getWalletHoldings: () => Promise.reject(new Error("not mocked")),
      getWalletActivity: () => Promise.reject(new Error("not mocked")),
      getCreatedTokens: () => Promise.reject(new Error("not mocked")),
      getKolTrades: () => Promise.reject(new Error("not mocked")),
      getSmartMoneyTrades: () => Promise.reject(new Error("not mocked")),
      ...(overrides.user ?? {}),
    },
    trade: {} as GmgnClient["trade"],
  };
}

// ─── Fixture builders ───────────────────────────────────────────────────────

function makeTokenInfo(overrides: Partial<GmgnTokenInfo> = {}): GmgnTokenInfo {
  return {
    address: "tokenAAA",
    symbol: "AAA",
    name: "Token AAA",
    decimals: 9,
    price: 0.000002,
    liquidity: 50000,
    holder_count: 1200,
    circulating_supply: 1_000_000_000,
    total_supply: 1_000_000_000,
    creation_timestamp: Math.floor(Date.now() / 1000) - 3600,
    open_timestamp: Math.floor(Date.now() / 1000) - 3600,
    ...overrides,
  };
}

function makeSecurity(overrides: Partial<GmgnTokenSecurity> = {}): GmgnTokenSecurity {
  return {
    renounced_freeze_account: true,
    renounced_mint: true,
    owner_renounced: true,
    is_honeypot: false,
    buy_tax: 0,
    sell_tax: 0,
    rug_ratio: 0.01,
    ...overrides,
  };
}

function makeHolder(overrides: Partial<GmgnHolder> = {}): GmgnHolder {
  return {
    address: "holder1",
    balance: 10000,
    percent: 1.0,
    ...overrides,
  };
}

function makeCreatedTokens(overrides: Partial<GmgnCreatedTokens> = {}): GmgnCreatedTokens {
  return {
    tokens: [
      {
        address: "prevTokenA",
        symbol: "PREV",
        name: "Prev Token",
        created_at: 1000,
        ath_mc: 500000,
      },
      { address: "prevTokenB", symbol: "RUG", name: "Rug Token", created_at: 2000, ath_mc: 80000 },
    ],
    total: 2,
    ...overrides,
  };
}

function makeCandles(count: number, stable: boolean): GmgnKlineCandle[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: 1000 + i * 900,
    open: stable ? 0.001 : 0.001 * (1 + i * 0.5),
    high: stable ? 0.0011 : 0.002 * (1 + i * 0.5),
    low: stable ? 0.0009 : 0.0005 * (1 + i * 0.5),
    close: stable ? 0.001 + i * 0.00001 : 0.001 * 3 ** i,
    volume: 10000,
  }));
}

const TOKEN_ADDR = "tokenAAA";

// ─── mapTokenInfo ────────────────────────────────────────────────────────────

describe("ResearchEngine.mapTokenInfo", () => {
  it("calculates marketCap as price * circulating_supply", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({ price: 0.000002, circulating_supply: 1_000_000_000 });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.marketCap).toBeCloseTo(0.000002 * 1_000_000_000);
  });

  it("sets marketCap to null when price is missing/NaN", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({ price: NaN, circulating_supply: 1_000_000_000 });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.marketCap).toBeNull();
  });

  it("sets symbol, name, liquidity and holderCount from info", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({
      symbol: "TKN",
      name: "TknName",
      liquidity: 75000,
      holder_count: 500,
    });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.symbol).toBe("TKN");
    expect(analysis.name).toBe("TknName");
    expect(analysis.liquidity).toBe(75000);
    expect(analysis.holderCount).toBe(500);
  });

  it('sets isOnCurve=true when launchpad_status is "1"', () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({ launchpad_status: "1", launchpad_progress: 0.65 });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.isOnCurve).toBe(true);
    expect(analysis.launchpadProgress).toBe(0.65);
  });

  it('sets isOnCurve=false when launchpad_status is not "1"', () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({ launchpad_status: undefined });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.isOnCurve).toBe(false);
  });

  it("maps dev fields from info.dev", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({
      dev: {
        address: "devWallet1",
        token_count: 5,
        ath_mc: 2_000_000,
        created_open_count: 3,
        created_inner_count: 1,
        created_open_ratio: 0.75,
      },
    });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.devAthMc).toBe(2_000_000);
    expect(analysis.creatorOpenCount).toBe(3);
    expect(analysis.creatorInnerCount).toBe(1);
    expect(analysis.creatorOpenRatio).toBe(0.75);
  });

  it("maps stat sub-fields when present", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const info = makeTokenInfo({
      stat: {
        volume_24h: 120000,
        price_change_5m: 3.5,
        holder_growth_rate: 0.12,
        fresh_wallet_rate: 0.4,
        smart_money_wallet_count: 7,
        smart_money_volume_ratio: 0.25,
        bluechip_owner_percentage: 0.08,
      },
    });

    engine.mapTokenInfo(info, analysis);

    expect(analysis.volume24h).toBe(120000);
    expect(analysis.priceChange5m).toBe(3.5);
    expect(analysis.holderGrowthRate).toBe(0.12);
    expect(analysis.freshWalletRate).toBe(0.4);
    expect(analysis.smartMoneyWalletCount).toBe(7);
    expect(analysis.smartMoneyVolumeRatio).toBe(0.25);
    expect(analysis.bluechipOwnerPercentage).toBe(0.08);
  });
});

// ─── mapSecurity ─────────────────────────────────────────────────────────────

describe("ResearchEngine.mapSecurity", () => {
  it("maps renounced_freeze_account to isFreezeAuthorityRenounced", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapSecurity(makeSecurity({ renounced_freeze_account: true }), analysis);
    expect(analysis.isFreezeAuthorityRenounced).toBe(true);

    const analysis2 = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    engine.mapSecurity(makeSecurity({ renounced_freeze_account: false }), analysis2);
    expect(analysis2.isFreezeAuthorityRenounced).toBe(false);
  });

  it("maps renounced_mint to isMintAuthorityRenounced", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapSecurity(makeSecurity({ renounced_mint: false }), analysis);
    expect(analysis.isMintAuthorityRenounced).toBe(false);
  });

  it("maps is_honeypot boolean true to isHoneypot=true", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapSecurity(makeSecurity({ is_honeypot: true }), analysis);
    expect(analysis.isHoneypot).toBe(true);
  });

  it("maps is_honeypot boolean false to isHoneypot=false", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapSecurity(makeSecurity({ is_honeypot: false }), analysis);
    expect(analysis.isHoneypot).toBe(false);
  });

  it("maps is_honeypot undefined to isHoneypot=null", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapSecurity(makeSecurity({ is_honeypot: undefined }), analysis);
    expect(analysis.isHoneypot).toBeNull();
  });

  it("maps tax, rugRatio, isWashTrading, and trader rates", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapSecurity(
      makeSecurity({
        buy_tax: 5,
        sell_tax: 10,
        rug_ratio: 0.08,
        is_wash_trading: true,
        rat_trader_amount_rate: 0.3,
        bundler_trader_amount_rate: 0.15,
        sniper_count: 12,
      }),
      analysis,
    );

    expect(analysis.buyTax).toBe(5);
    expect(analysis.sellTax).toBe(10);
    expect(analysis.rugRatio).toBe(0.08);
    expect(analysis.isWashTrading).toBe(true);
    expect(analysis.ratTraderRate).toBe(0.3);
    expect(analysis.bundlerRate).toBe(0.15);
    expect(analysis.sniperCount).toBe(12);
  });
});

// ─── mapHolders ──────────────────────────────────────────────────────────────

describe("ResearchEngine.mapHolders", () => {
  it("calculates privateVaultHoldRate as fraction of locked holders", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const holders: GmgnHolder[] = [
      makeHolder({ address: "h1", is_locked: true }),
      makeHolder({ address: "h2", is_locked: true }),
      makeHolder({ address: "h3", is_locked: false }),
      makeHolder({ address: "h4", is_locked: false }),
    ];

    engine.mapHolders(holders, analysis);

    expect(analysis.privateVaultHoldRate).toBeCloseTo(0.5);
  });

  it("sets privateVaultHoldRate=0 when no holders are locked", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const holders: GmgnHolder[] = [
      makeHolder({ address: "h1", is_locked: false }),
      makeHolder({ address: "h2", is_locked: false }),
    ];

    engine.mapHolders(holders, analysis);

    expect(analysis.privateVaultHoldRate).toBe(0);
  });

  it("does nothing when holders array is empty", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapHolders([], analysis);

    expect(analysis.privateVaultHoldRate).toBeNull();
  });
});

// ─── mapDevHistory ────────────────────────────────────────────────────────────

describe("ResearchEngine.mapDevHistory", () => {
  it("derives devAthMc as max ath_mc across created tokens", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const created = makeCreatedTokens({
      tokens: [
        { address: "a", symbol: "A", name: "A", created_at: 1000, ath_mc: 100000 },
        { address: "b", symbol: "B", name: "B", created_at: 2000, ath_mc: 999999 },
        { address: "c", symbol: "C", name: "C", created_at: 3000, ath_mc: 50000 },
      ],
    });

    engine.mapDevHistory(created, analysis);

    expect(analysis.devAthMc).toBe(999999);
  });

  it("does not override devAthMc if already set from info.dev", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    analysis.devAthMc = 5_000_000; // already populated from info.dev

    const created = makeCreatedTokens({
      tokens: [{ address: "a", symbol: "A", name: "A", created_at: 1000, ath_mc: 100000 }],
    });

    engine.mapDevHistory(created, analysis);

    // Should not be overridden since it was already set
    expect(analysis.devAthMc).toBe(5_000_000);
  });

  it("handles empty tokens array without crashing", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapDevHistory({ tokens: [], total: 0 }, analysis);

    expect(analysis.devAthMc).toBeNull();
  });

  it("handles NaN/missing ath_mc values without crashing", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");
    const created: GmgnCreatedTokens = {
      tokens: [
        { address: "a", symbol: "A", name: "A", created_at: 1000, ath_mc: undefined },
        { address: "b", symbol: "B", name: "B", created_at: 2000, ath_mc: NaN },
        { address: "c", symbol: "C", name: "C", created_at: 3000, ath_mc: 200000 },
      ],
    };

    engine.mapDevHistory(created, analysis);

    // Only valid finite value should be used
    expect(analysis.devAthMc).toBe(200000);
  });
});

// ─── mapKlineStability ────────────────────────────────────────────────────────

describe("ResearchEngine.mapKlineStability", () => {
  it("sets liquidityStable=true for stable candles (low CV)", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapKlineStability(makeCandles(12, true), analysis);

    expect(analysis.liquidityStable).toBe(true);
  });

  it("sets liquidityStable=false for volatile candles (high CV)", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapKlineStability(makeCandles(12, false), analysis);

    expect(analysis.liquidityStable).toBe(false);
  });

  it("sets liquidityStable=null when too few candles", () => {
    const engine = new ResearchEngine(makeClient(), "sol");
    const analysis = createEmptyTokenAnalysis(TOKEN_ADDR, "sol");

    engine.mapKlineStability(makeCandles(2, true), analysis);

    expect(analysis.liquidityStable).toBeNull();
  });
});

// ─── research() integration: partialData flag ─────────────────────────────────

describe("ResearchEngine.research() - partialData", () => {
  it("sets partialData=true when any endpoint throws", async () => {
    // All endpoints fail
    const client = makeClient();
    const engine = new ResearchEngine(client, "sol");

    const result = await engine.research(TOKEN_ADDR);

    expect(result.partialData).toBe(true);
    expect(result.address).toBe(TOKEN_ADDR);
    expect(result.chain).toBe("sol");
  });

  it("sets partialData=false when all endpoints succeed", async () => {
    const info = makeTokenInfo();
    const client = makeClient({
      token: {
        getInfo: () => Promise.resolve(info),
        getSecurity: () => Promise.resolve(makeSecurity()),
        getPool: () =>
          Promise.resolve({
            address: "poolAddr",
            dex: "raydium",
            token_address: TOKEN_ADDR,
            base_reserve: 1000,
            quote_reserve: 2000,
            liquidity: 50000,
            created_at: 1000,
          }),
        getTopHolders: () => Promise.resolve([makeHolder()]),
        getTopTraders: () => Promise.resolve([]),
      },
      market: {
        getTrending: () => Promise.reject(new Error("not used")),
        getTrenches: () => Promise.reject(new Error("not used")),
        getKline: () => Promise.resolve(makeCandles(12, true)),
      },
      // No dev address on info.dev, so getCreatedTokens won't be called
    });

    const engine = new ResearchEngine(client, "sol");
    const result = await engine.research(TOKEN_ADDR);

    expect(result.partialData).toBe(false);
  });

  it("sets partialData=true when only security endpoint fails", async () => {
    const info = makeTokenInfo();
    const client = makeClient({
      token: {
        getInfo: () => Promise.resolve(info),
        getSecurity: () => Promise.reject(new Error("security down")),
        getPool: () =>
          Promise.resolve({
            address: "poolAddr",
            dex: "raydium",
            token_address: TOKEN_ADDR,
            base_reserve: 1000,
            quote_reserve: 2000,
            liquidity: 50000,
            created_at: 1000,
          }),
        getTopHolders: () => Promise.resolve([]),
        getTopTraders: () => Promise.resolve([]),
      },
      market: {
        getTrending: () => Promise.reject(new Error("not used")),
        getTrenches: () => Promise.reject(new Error("not used")),
        getKline: () => Promise.resolve(makeCandles(12, true)),
      },
    });

    const engine = new ResearchEngine(client, "sol");
    const result = await engine.research(TOKEN_ADDR);

    expect(result.partialData).toBe(true);
    // Other fields from info should still be mapped
    expect(result.symbol).toBe("AAA");
  });

  it("calls getCreatedTokens with dev address from info.dev", async () => {
    const getCreatedTokens = vi.fn().mockResolvedValue(makeCreatedTokens());
    const info = makeTokenInfo({
      dev: { address: "devWallet1", token_count: 2 },
    });

    const client = makeClient({
      token: {
        getInfo: () => Promise.resolve(info),
        getSecurity: () => Promise.resolve(makeSecurity()),
        getPool: () =>
          Promise.resolve({
            address: "pool1",
            dex: "raydium",
            token_address: TOKEN_ADDR,
            base_reserve: 100,
            quote_reserve: 200,
            liquidity: 50000,
            created_at: 1000,
          }),
        getTopHolders: () => Promise.resolve([]),
        getTopTraders: () => Promise.resolve([]),
      },
      market: {
        getTrending: () => Promise.reject(new Error("not used")),
        getTrenches: () => Promise.reject(new Error("not used")),
        getKline: () => Promise.resolve([]),
      },
      user: {
        getWalletStats: () => Promise.reject(new Error("not used")),
        getWalletHoldings: () => Promise.reject(new Error("not used")),
        getWalletActivity: () => Promise.reject(new Error("not used")),
        getCreatedTokens,
        getKolTrades: () => Promise.reject(new Error("not used")),
        getSmartMoneyTrades: () => Promise.reject(new Error("not used")),
      },
    });

    const engine = new ResearchEngine(client, "sol");
    await engine.research(TOKEN_ADDR);

    expect(getCreatedTokens).toHaveBeenCalledWith("sol", "devWallet1");
  });
});
