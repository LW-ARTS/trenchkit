import { describe, expect, it } from "vitest";
import { Pipeline } from "../../src/engine/pipeline.js";
import type { GmgnClient } from "../../src/foundation/api/client.js";
import { pipelineEvents } from "../../src/foundation/events.js";

function makeClient(): GmgnClient {
  return {
    token: {} as GmgnClient["token"],
    market: {} as GmgnClient["market"],
    user: {} as GmgnClient["user"],
    trade: {} as GmgnClient["trade"],
  };
}

describe("Pipeline.dispose", () => {
  it("removes the convergence:detected listener", () => {
    const baseline = pipelineEvents.listenerCount("convergence:detected");
    const p1 = new Pipeline(makeClient(), "sol");
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline + 1);
    p1.dispose();
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline);
  });

  it("is idempotent — double dispose() does not remove unrelated listeners", () => {
    const p1 = new Pipeline(makeClient(), "sol");
    const p2 = new Pipeline(makeClient(), "base");
    const beforeDispose = pipelineEvents.listenerCount("convergence:detected");
    p1.dispose();
    p1.dispose(); // second call must be a no-op
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(beforeDispose - 1);
    p2.dispose(); // cleanup
  });

  it("two pipelines constructed and disposed back-to-back leave zero residual listeners", () => {
    const baseline = pipelineEvents.listenerCount("convergence:detected");
    const p1 = new Pipeline(makeClient(), "sol");
    const p2 = new Pipeline(makeClient(), "base");
    p1.dispose();
    p2.dispose();
    expect(pipelineEvents.listenerCount("convergence:detected")).toBe(baseline);
  });
});
