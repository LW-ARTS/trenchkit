import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GmgnClient } from "../../src/foundation/api/client.js";
import { createEmptyTokenAnalysis, type TokenAnalysis } from "../../src/foundation/types.js";

const { pollTrending, pollTrenches, research } = vi.hoisted(() => ({
  pollTrending: vi.fn<() => Promise<TokenAnalysis[]>>(),
  pollTrenches: vi.fn<() => Promise<TokenAnalysis[]>>(),
  research: vi.fn<(address: string) => Promise<TokenAnalysis>>(),
}));

vi.mock("../../src/modules/scanner.js", () => ({
  Scanner: class {
    pollTrending = pollTrending;
    pollTrenches = pollTrenches;
  },
}));

vi.mock("../../src/modules/research.js", () => ({
  ResearchEngine: class {
    research = research;
  },
}));

import { Pipeline } from "../../src/engine/pipeline.js";

function makeClient(): GmgnClient {
  return {
    token: {} as GmgnClient["token"],
    market: {} as GmgnClient["market"],
    user: {} as GmgnClient["user"],
    trade: {} as GmgnClient["trade"],
  } as GmgnClient;
}

// Thin trending-feed snapshot, as produced by Scanner.
function scanned(address: string, overrides: Partial<TokenAnalysis> = {}): TokenAnalysis {
  return {
    ...createEmptyTokenAnalysis(address, "sol"),
    holderCount: 500,
    age: 1800,
    liquidity: 20_000,
    rugRatio: 0.1,
    ...overrides,
  };
}

// Fully populated research result for a healthy token.
function researched(address: string, overrides: Partial<TokenAnalysis> = {}): TokenAnalysis {
  return {
    ...createEmptyTokenAnalysis(address, "sol"),
    holderCount: 500,
    age: 1800,
    liquidity: 60_000,
    isOnCurve: false,
    isRenounced: true,
    isMintAuthorityRenounced: true,
    isFreezeAuthorityRenounced: true,
    rugRatio: 0.1,
    top10HolderRate: 0.3,
    freshWalletRate: 0.2,
    insiderHoldRate: 0,
    botDegenRate: 0.05,
    bundlerRate: 0.05,
    ratTraderRate: 0.05,
    sniperCount: 3,
    privateVaultHoldRate: 0,
    creatorOpenCount: 2,
    creatorInnerCount: 2,
    creatorOpenRatio: 0.5,
    smartMoneyWalletCount: 3,
    smartMoneyVolumeRatio: 0.3,
    liquidityStable: true,
    ...overrides,
  };
}

let pipeline: Pipeline;

beforeEach(() => {
  pollTrending.mockReset();
  pollTrenches.mockReset().mockResolvedValue([]);
  research.mockReset().mockImplementation(async (address) => researched(address));
  pipeline = new Pipeline(makeClient(), "sol");
});

afterEach(() => {
  pipeline.dispose();
  vi.useRealTimers();
});

describe("Pipeline.scan", () => {
  it("scores candidates from full research data, not the trending snapshot", async () => {
    pollTrending.mockResolvedValue([scanned("A")]);

    const [token] = await pipeline.scan();

    expect(research).toHaveBeenCalledWith("A");
    expect(Object.keys(token?.dimensionScores ?? {})).toHaveLength(6);
  });

  it("scores a token research could not fill in as AVOID, not safe", async () => {
    pollTrending.mockResolvedValue([scanned("A")]);
    research.mockResolvedValue({ ...createEmptyTokenAnalysis("A", "sol"), partialData: true });

    const [token] = await pipeline.scan();

    expect(token?.convictionLabel).toBe("AVOID");
  });

  it("keeps trending-feed fields that research did not return", async () => {
    pollTrending.mockResolvedValue([scanned("A", { symbol: "ABC", lifecycleStage: "EARLY" })]);

    const [token] = await pipeline.scan();

    expect(token?.symbol).toBe("ABC");
    expect(token?.lifecycleStage).toBe("EARLY");
  });

  it("drops candidates that fail hard filters once research data is in", async () => {
    pollTrending.mockResolvedValue([scanned("A")]);
    research.mockResolvedValue(researched("A", { botDegenRate: 0.9 }));

    expect(await pipeline.scan()).toEqual([]);
  });

  it("researches at most 10 candidates per scan", async () => {
    pollTrending.mockResolvedValue(Array.from({ length: 15 }, (_, i) => scanned(`T${i}`)));

    const tokens = await pipeline.scan();

    expect(research).toHaveBeenCalledTimes(10);
    expect(tokens).toHaveLength(10);
  });

  it("researches a token once when it appears in both trending and trenches", async () => {
    pollTrending.mockResolvedValue([scanned("A")]);
    pollTrenches.mockResolvedValue([scanned("A")]);

    const tokens = await pipeline.scan();

    expect(research).toHaveBeenCalledTimes(1);
    expect(tokens).toHaveLength(1);
  });

  it("reuses a token's research result within 5 minutes", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    pollTrending.mockResolvedValue([scanned("A")]);

    await pipeline.scan();
    vi.setSystemTime(1_000_000 + 5 * 60_000 - 1);
    await pipeline.scan();

    expect(research).toHaveBeenCalledTimes(1);
  });

  it("re-researches a token after 5 minutes", async () => {
    vi.useFakeTimers({ now: 1_000_000 });
    pollTrending.mockResolvedValue([scanned("A")]);

    await pipeline.scan();
    vi.setSystemTime(1_000_000 + 5 * 60_000);
    await pipeline.scan();

    expect(research).toHaveBeenCalledTimes(2);
  });
});
