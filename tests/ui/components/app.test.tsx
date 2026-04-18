import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GmgnClient } from "../../../src/foundation/api/client.js";
import type { TokenAnalysis } from "../../../src/foundation/types.js";
import type { ConvergenceAlert, NormalizedTrade } from "../../../src/modules/smart-money.js";
import { App } from "../../../src/ui/components/App.js";
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

// ink-testing-library's mock Stdout reports 100 cols and no rows (defaults to 24).
// TooSmallFallback requires 100×30 — force-mock useTerminalSize so the real grid renders.
vi.mock("../../../src/ui/hooks/useTerminalSize.js", () => ({
  useTerminalSize: () => ({ cols: 120, rows: 40 }),
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

describe("App (smoke)", () => {
  beforeEach(() => {
    mockScan.mockResolvedValue([]);
    mockPollSM.mockResolvedValue([]);
    mockGetRecent.mockReturnValue([]);
    mockDispose.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mounts providers + shell + panels on first frame", async () => {
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <App chain="sol" client={client} hasPrivateKey={false} />,
    );
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("SCANNER");
    expect(frame).toContain("built by @LWARTSS");
    unmount();
  });

  it("renders other panel headers as well", async () => {
    const client = buildMockClient();
    const { lastFrame, unmount } = render(
      <App chain="sol" client={client} hasPrivateKey={false} />,
    );
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("SMART MONEY");
    expect(frame).toContain("CONVERGENCE");
    expect(frame).toContain("RESEARCH");
    unmount();
  });
});
