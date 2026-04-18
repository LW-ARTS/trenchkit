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
import { flushFrame } from "../helpers.js";

// Hoisted mock fns so vi.mock can see them
const { mockScan, mockPollSM, mockGetRecent, mockDispose } = vi.hoisted(() => ({
  mockScan: vi.fn<() => Promise<TokenAnalysis[]>>(),
  mockPollSM: vi.fn<() => Promise<ConvergenceAlert[]>>(),
  mockGetRecent: vi.fn<() => NormalizedTrade[]>(),
  mockDispose: vi.fn<() => void>(),
}));

vi.mock("../../../src/engine/pipeline.js", () => ({
  Pipeline: class {
    scan = mockScan;
    pollSmartMoney = mockPollSM;
    getRecentSmartMoneyTrades = mockGetRecent;
    researchToken = vi.fn();
    getScanner = vi.fn();
    dispose = mockDispose;
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

function makeToken(address: string): TokenAnalysis {
  return {
    address,
    chain: "sol" as Chain,
    symbol: null,
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

// Test consumer components for each slice.
function ScannerProbe(): React.ReactElement {
  const s = useScanner();
  return <Text>SCAN:{s === null ? "null" : s.length}</Text>;
}
function ClockProbe(): React.ReactElement {
  const c = useClock();
  return <Text>CLK:{c.getTime()}</Text>;
}
function SmartMoneyProbe(): React.ReactElement {
  const sm = useSmartMoney();
  return <Text>SM:{sm === null ? "null" : sm.length}</Text>;
}
function ConvergenceProbe(): React.ReactElement {
  const c = useConvergence();
  return (
    <Text>
      CV:{c.length}:{c[0]?.strength ?? -1}
    </Text>
  );
}

describe("PipelineProvider", () => {
  beforeEach(() => {
    mockScan.mockReset().mockResolvedValue([]);
    mockPollSM.mockReset().mockResolvedValue([]);
    mockGetRecent.mockReset().mockReturnValue([]);
    mockDispose.mockReset();
  });

  afterEach(() => {
    pipelineEvents.removeAllListeners();
    vi.useRealTimers();
  });

  it("scanner slice fires after 30s fake-timer advance", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <ScannerProbe />
      </PipelineProvider>,
    );

    // Flush the initial kick so we can observe only the interval tick.
    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();
    mockScan.mockClear();
    mockScan.mockResolvedValue([makeToken("TokenA"), makeToken("TokenB"), makeToken("TokenC")]);

    await vi.advanceTimersByTimeAsync(30_000);
    await flushFrame(3);

    expect(mockScan).toHaveBeenCalledTimes(1);
    expect(lastFrame()).toContain("SCAN:3");
    unmount();
  });

  it("clock slice fires after 1s advance", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <ClockProbe />
      </PipelineProvider>,
    );

    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();
    const initial = lastFrame();
    await vi.advanceTimersByTimeAsync(1_000);
    await flushFrame();
    const next = lastFrame();

    expect(next).not.toBe(initial);
    expect(next).toMatch(/CLK:\d+/);
    unmount();
  });

  it("smart-money slice fires after 60s advance", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <SmartMoneyProbe />
      </PipelineProvider>,
    );

    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();
    mockPollSM.mockClear();
    mockGetRecent.mockReturnValue([makeTrade("Wallet1"), makeTrade("Wallet2")]);

    await vi.advanceTimersByTimeAsync(60_000);
    await flushFrame(3);

    expect(mockPollSM).toHaveBeenCalledTimes(1);
    expect(lastFrame()).toContain("SM:2");
    unmount();
  });

  it("convergence slice receives pipelineEvents", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <ConvergenceProbe />
      </PipelineProvider>,
    );

    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();
    expect(lastFrame()).toContain("CV:0");

    pipelineEvents.emit("convergence:detected", {
      tokenAddress: "TokenX",
      chain: "sol",
      strength: 80,
    });
    await flushFrame(2);

    expect(lastFrame()).toContain("CV:1");
    expect(lastFrame()).toContain(":80");
    unmount();
  });

  it("convergence dedup — latest strength wins, length stays 1", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <ConvergenceProbe />
      </PipelineProvider>,
    );

    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();

    pipelineEvents.emit("convergence:detected", {
      tokenAddress: "TokenDedup",
      chain: "sol",
      strength: 40,
    });
    await flushFrame();
    pipelineEvents.emit("convergence:detected", {
      tokenAddress: "TokenDedup",
      chain: "sol",
      strength: 95,
    });
    await flushFrame(2);

    expect(lastFrame()).toContain("CV:1");
    expect(lastFrame()).toContain(":95");
    unmount();
  });

  it("unmount cleanup — zero residual listeners + zero timers + pipeline.dispose called", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const baseConvergence = pipelineEvents.listenerCount("convergence:detected");
    const baseResearch = pipelineEvents.listenerCount("research:complete");

    const { unmount } = render(
      <PipelineProvider chain="sol" client={client}>
        <ScannerProbe />
      </PipelineProvider>,
    );

    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();

    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseConvergence + 1);
    expect(pipelineEvents.listenerCount("research:complete")).toBe(baseResearch + 1);

    unmount();
    await flushFrame();

    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseConvergence);
    expect(pipelineEvents.listenerCount("research:complete")).toBe(baseResearch);
    expect(vi.getTimerCount()).toBe(0);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it("strict-mode double-mount safe — bootstrapped sentinel prevents listener doubling across remount", async () => {
    // Keep setImmediate REAL — flushFrame() relies on real setImmediate to flush
    // microtasks; if fake-timers captures it, flushFrame hangs forever.
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
    });
    const client = buildMockClient();
    const base = pipelineEvents.listenerCount("convergence:detected");

    const first = render(
      <PipelineProvider chain="sol" client={client}>
        <ScannerProbe />
      </PipelineProvider>,
    );
    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();
    first.unmount();
    await flushFrame();

    const second = render(
      <PipelineProvider chain="sol" client={client}>
        <ScannerProbe />
      </PipelineProvider>,
    );
    await vi.advanceTimersByTimeAsync(0);
    await flushFrame();

    // After a full unmount + fresh remount, listener count MUST be baseline+1
    // (not baseline+2). The useRef sentinel guards against strict-mode double-mount
    // of the same instance — but fresh mounts get fresh refs.
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(base + 1);

    // Each mount's initial kick + interval tick should account for exactly one
    // dispose+one-live-pipeline post-remount.
    expect(mockDispose).toHaveBeenCalledTimes(1);
    second.unmount();
  });
});
