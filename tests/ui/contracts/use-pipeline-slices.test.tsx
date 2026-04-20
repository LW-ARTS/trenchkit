import { Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GmgnClient } from "../../../src/foundation/api/client.js";
import { pipelineEvents } from "../../../src/foundation/events.js";
import type { Chain, TokenAnalysis } from "../../../src/foundation/types.js";
import type { ConvergenceAlert, NormalizedTrade } from "../../../src/modules/smart-money.js";
import { useClock } from "../../../src/ui/hooks/useClock.js";
import { useConvergence } from "../../../src/ui/hooks/useConvergence.js";
import { useScanner } from "../../../src/ui/hooks/useScanner.js";
import { useSmartMoney } from "../../../src/ui/hooks/useSmartMoney.js";
import { PipelineProvider } from "../../../src/ui/providers/PipelineProvider.js";
import { waitForFrame } from "../helpers.js";

/**
 * Contract lock: — slice update cadence.
 *
 * Locks the PipelineProvider behavior against future regression:
 *   - scanner slice updates 30s after mount
 *   - clock slice updates 1s after mount
 *   - smart-money slice updates 60s after mount
 *   - convergence slice updates in response to pipelineEvents.emit
 *
 * Also validates that the global `afterEach` cleanup actually
 * runs (register listener in one test, assert zero residual in the next).
 */

// Hoisted mock fns so vi.mock can see them before module resolution.
const { mockScan, mockPollSM, mockGetRecent } = vi.hoisted(() => ({
  mockScan: vi.fn<() => Promise<TokenAnalysis[]>>(),
  mockPollSM: vi.fn<() => Promise<ConvergenceAlert[]>>(),
  mockGetRecent: vi.fn<() => NormalizedTrade[]>(),
}));

vi.mock("../../../src/engine/pipeline.js", () => ({
  Pipeline: class {
    scan = mockScan;
    pollSmartMoney = mockPollSM;
    getRecentSmartMoneyTrades = mockGetRecent;
    researchToken = vi.fn();
    getScanner = vi.fn();
    dispose = vi.fn();
  },
}));

function buildMockClient(): GmgnClient {
  return {
    token: {} as GmgnClient["token"],
    market: {} as GmgnClient["market"],
    user: {} as GmgnClient["user"],
    trade: {} as GmgnClient["trade"],
    rateLimiter: {
      schedule: vi.fn(),
      applyPenalty: vi.fn(),
      getStatus: () => "ok" as const,
    },
  } as unknown as GmgnClient;
}

function makeToken(address: string, symbol: string): TokenAnalysis {
  return {
    address,
    chain: "sol" as Chain,
    symbol,
    name: null,
    marketCap: null,
    liquidity: null,
    holderCount: null,
    volume24h: null,
    age: null,
    priceChange5m: null,
    isHoneypot: null,
    isRenounced: null,
    isFreezeAuthorityRenounced: null,
    isMintAuthorityRenounced: null,
    buyTax: null,
    sellTax: null,
    rugRatio: null,
    burnRatio: null,
    isWashTrading: null,
    isOnCurve: null,
    launchpadProgress: null,
    top10HolderRate: null,
    holderGrowthRate: null,
    freshWalletRate: null,
    insiderHoldRate: null,
    botDegenRate: null,
    bundlerRate: null,
    ratTraderRate: null,
    sniperCount: null,
    bluechipOwnerPercentage: null,
    privateVaultHoldRate: null,
    creatorOpenCount: null,
    creatorInnerCount: null,
    creatorOpenRatio: null,
    devAthMc: null,
    smartMoneyWalletCount: null,
    smartMoneyVolumeRatio: null,
    convergenceStrength: null,
    liquidityStable: null,
    lifecycleStage: null,
    dimensionScores: null,
    convictionScore: null,
    convictionLabel: null,
    partialData: false,
  };
}

function makeTrade(maker: string, timestamp = 1_000_000): NormalizedTrade {
  return {
    maker,
    makerName: null,
    side: "buy",
    amountUsd: 1000,
    isFullOpen: false,
    timestamp,
    source: "smartmoney",
  };
}

function AllSlicesProbe(): React.ReactElement {
  const scanner = useScanner();
  const sm = useSmartMoney();
  const conv = useConvergence();
  const clock = useClock();
  const scannerSym = scanner === null ? "null" : (scanner[0]?.symbol ?? "empty");
  const smCount = sm === null ? "null" : String(sm.length);
  const convCount = String(conv.length);
  const convStrength = conv[0]?.strength ?? -1;
  return (
    <Text>
      {`SCAN=${scannerSym} SM=${smCount} CV=${convCount}:${convStrength} CLK=${clock.getTime()}`}
    </Text>
  );
}

describe("contract: usePipeline slice updates", () => {
  beforeEach(() => {
    mockScan.mockReset().mockResolvedValue([]);
    mockPollSM.mockReset().mockResolvedValue([]);
    mockGetRecent.mockReset().mockReturnValue([]);
    // setImmediate must stay REAL — flushFrame + waitForFrame rely on it.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scanner slice updates after 30s", async () => {
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <AllSlicesProbe />
      </PipelineProvider>,
    );

    // Initial kick resolves empty (beforeEach default). Flush that first so
    // the 30s interval tick observes only the new return value.
    await waitForFrame(0);
    expect(lastFrame() ?? "").toContain("SCAN=empty");

    mockScan.mockResolvedValueOnce([makeToken("TokA", "TOKA"), makeToken("TokB", "TOKB")]);
    await waitForFrame(30_000);
    // Ink + React 19 sometimes need an extra microtask for the
    // setScanner commit to reach the frame buffer.
    await waitForFrame(0);

    const frame = lastFrame() ?? "";
    expect(frame).toContain("SCAN=TOKA");
    unmount();
  });

  it("clock slice updates after 1s", async () => {
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <AllSlicesProbe />
      </PipelineProvider>,
    );

    await waitForFrame(0);
    const initialFrame = lastFrame() ?? "";
    const initialClock = initialFrame.match(/CLK=(\d+)/)?.[1] ?? "";
    expect(initialClock).not.toBe("");

    await waitForFrame(1_000);
    const nextFrame = lastFrame() ?? "";
    const nextClock = nextFrame.match(/CLK=(\d+)/)?.[1] ?? "";

    expect(nextClock).not.toBe(initialClock);
    expect(Number(nextClock)).toBeGreaterThan(Number(initialClock));
    unmount();
  });

  it("smart-money + convergence slices update after 60s + pipelineEvents.emit", async () => {
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <AllSlicesProbe />
      </PipelineProvider>,
    );

    await waitForFrame(0);
    expect(lastFrame() ?? "").toContain("SM=0");

    // Arrange: next SM cycle returns 2 trades.
    mockGetRecent.mockReturnValueOnce([makeTrade("W1"), makeTrade("W2")]);

    await waitForFrame(60_000);
    await waitForFrame(0);

    expect(lastFrame() ?? "").toContain("SM=2");

    // Convergence: emit a detected event; provider pushes it into the slice.
    pipelineEvents.emit("convergence:detected", {
      tokenAddress: "TokenConv",
      chain: "sol",
      strength: 80,
    });
    await waitForFrame(0);

    const frame = lastFrame() ?? "";
    expect(frame).toContain("CV=1:80");
    unmount();
  });

  // ------------------------------------------------------------------
  // Task 2 validation: global afterEach(pipelineEvents.removeAllListeners)
  // -----------------------------------------------------------------
  // These two tests MUST run in declaration order (Vitest's default).
  // Test A registers a stray listener; Test B asserts zero residual.
  // If the global setup file is missing or broken, Test B fails.

  it("registers a stray pipelineEvents listener (part 1/2 of cleanup check)", () => {
    pipelineEvents.on("research:complete", () => {
      // intentional no-op — the point is the subscription itself
    });
    expect(pipelineEvents.listenerCount("research:complete")).toBeGreaterThan(0);
  });

  it("asserts prior listener was cleaned up by global afterEach (part 2/2)", () => {
    expect(pipelineEvents.listenerCount("research:complete")).toBe(0);
  });
});
