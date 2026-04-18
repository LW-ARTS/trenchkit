import { Command } from "commander";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock config.js BEFORE importing the module under test so the vi.mock hoist
// replaces loadApiKey / hasPrivateKey / loadConfig before live.tsx evaluates.
vi.mock("../../src/foundation/config.js", () => ({
  loadApiKey: vi.fn(() => "test-api-key"),
  hasPrivateKey: vi.fn(() => false),
  loadConfig: vi.fn(() => ({
    defaultChain: "sol",
    maxTradeAmount: 1,
    defaultPriorityFee: 0.00001,
    defaultTipFee: 0.00001,
  })),
}));

// Mock createGmgnClient so we never construct a real network client.
vi.mock("../../src/foundation/api/client.js", () => ({
  createGmgnClient: vi.fn(() => ({
    token: {},
    market: {},
    user: {},
    trade: {},
    rateLimiter: {
      schedule: vi.fn(),
      applyPenalty: vi.fn(),
      getStatus: () => "ok",
    },
  })),
}));

// Mock ink.render so no Ink instance spins up — the validation paths MUST
// return before render() anyway. If a test trips into render() we'll detect
// by asserting render was NOT called. Use vi.hoisted so the mock fn is
// defined before vi.mock hoists.
const { mockInkRender } = vi.hoisted(() => ({
  mockInkRender: vi.fn(() => ({
    unmount: vi.fn(),
    waitUntilExit: () => Promise.resolve(),
    rerender: vi.fn(),
    cleanup: vi.fn(),
    clear: vi.fn(),
  })),
}));
vi.mock("ink", () => ({
  render: mockInkRender,
}));

// Mock src/ui/index.js so the App import does not drag the whole Ink
// component tree into the test. The test never exercises Ink.
vi.mock("../../src/ui/index.js", () => ({
  App: () => null,
}));

import { registerLiveCommand } from "../../src/commands/live.js";
import * as configModule from "../../src/foundation/config.js";

function buildProgram(): Command {
  const program = new Command();
  program.exitOverride(); // prevents Commander from calling process.exit on help/version
  registerLiveCommand(program);
  return program;
}

describe("live command validation paths", () => {
  let originalIsTTY: boolean | undefined;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Capture + assert stderr output via console.error spy.
    errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset exitCode so each test starts clean.
    process.exitCode = 0;
    // Save original isTTY; force true for tests that don't test the TTY gate.
    originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { value: true, configurable: true });
    // Reset mock call histories.
    mockInkRender.mockClear();
    vi.mocked(configModule.loadApiKey).mockReturnValue("test-api-key");
    vi.mocked(configModule.hasPrivateKey).mockReturnValue(false);
  });

  afterEach(() => {
    // Restore isTTY.
    if (originalIsTTY === undefined) {
      delete (process.stdin as { isTTY?: boolean }).isTTY;
    } else {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      });
    }
    errSpy.mockRestore();
    process.exitCode = 0;
    vi.restoreAllMocks();
  });

  it("prints Invalid chain error and sets exitCode=1 when --chain is unknown", async () => {
    const program = buildProgram();
    await program.parseAsync(["node", "trenchkit", "live", "--chain", "doge"]);
    const calls = errSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => /Invalid chain "doge"/.test(m))).toBe(true);
    expect(process.exitCode).toBe(1);
    expect(mockInkRender).not.toHaveBeenCalled();
  });

  it("prints TTY error and sets exitCode=1 when stdin is not a TTY", async () => {
    Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });
    const program = buildProgram();
    await program.parseAsync(["node", "trenchkit", "live", "--chain", "sol"]);
    const calls = errSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => /requires a TTY/.test(m))).toBe(true);
    expect(process.exitCode).toBe(1);
    expect(mockInkRender).not.toHaveBeenCalled();
  });

  it("prints API key required error and sets exitCode=1 when loadApiKey returns null", async () => {
    vi.mocked(configModule.loadApiKey).mockReturnValue(null);
    const program = buildProgram();
    await program.parseAsync(["node", "trenchkit", "live", "--chain", "sol"]);
    const calls = errSpy.mock.calls.map((c) => String(c[0]));
    expect(calls.some((m) => /API key required/.test(m))).toBe(true);
    expect(process.exitCode).toBe(1);
    expect(mockInkRender).not.toHaveBeenCalled();
  });
});
