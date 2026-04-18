import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies before importing the module under test
vi.mock("../../src/foundation/config.js", () => ({
  loadApiKey: vi.fn(() => "test-api-key"),
  loadConfig: vi.fn(() => ({
    defaultChain: "sol",
    maxTradeAmount: 1,
    defaultPriorityFee: 0.00001,
    defaultTipFee: 0.00001,
  })),
}));

vi.mock("../../src/foundation/api/client.js", () => ({
  createGmgnClient: vi.fn(() => ({
    token: {},
    market: {},
    user: {},
    trade: {},
  })),
}));

// Stub the Pipeline so scan() returns deterministically and we can still verify
// that the listener-count invariant holds via the real pipelineEvents emitter.
// We import the real Pipeline class indirectly through scan.ts, which means the
// real convergence listener IS registered and MUST be disposed on SIGINT.
// We only mock scan() itself to avoid hitting the network.
vi.mock("../../src/engine/pipeline.js", async () => {
  // Keep the real Pipeline so listener registration is exercised, but stub
  // its async scan() method to return an empty list deterministically.
  const actual = await vi.importActual<typeof import("../../src/engine/pipeline.js")>(
    "../../src/engine/pipeline.js",
  );
  class StubPipeline extends actual.Pipeline {
    override async scan() {
      return [];
    }
  }
  return { Pipeline: StubPipeline };
});

import { runScanLoop } from "../../src/commands/scan.js";
import { pipelineEvents } from "../../src/foundation/events.js";

describe("runScanLoop (scan --watch listener-leak invariant)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Silence console output from the command during the test.
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "clear").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.removeAllListeners("SIGINT");
  });

  it("registers exactly one convergence:detected listener across multiple ticks", async () => {
    const baseline = pipelineEvents.listenerCount("convergence:detected");

    // Start the loop. It runs the first render synchronously (from our POV,
    // the initial await), then schedules a 30s interval.
    const loopPromise = runScanLoop("sol", undefined, 30_000);

    // Initial render has begun; exactly one pipeline has been constructed.
    // Drain the initial render.
    await vi.advanceTimersByTimeAsync(0);
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline + 1);

    // Fire three interval ticks. If the old code were still in place (per-tick
    // new Pipeline()), listenerCount would grow by 3. With the fix it stays at
    // baseline + 1 because a single Pipeline is reused across ticks.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline + 1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline + 1);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline + 1);

    // Trigger SIGINT -- the loop's handler clears the interval and disposes
    // the pipeline. The listener count must return to baseline.
    process.emit("SIGINT");

    // Let the SIGINT handler and any pending timers drain.
    await vi.advanceTimersByTimeAsync(0);

    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline);

    // The outer loopPromise resolved after the initial renderOnce; awaiting
    // it here is safe and prevents an unhandled promise warning.
    await loopPromise;
  });
});
