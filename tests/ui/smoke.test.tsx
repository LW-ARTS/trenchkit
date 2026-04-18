import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { SmokeApp } from "../../src/ui/smoke.js";
import { flushFrame } from "./helpers.js";

describe("Ink 7 + React 19 + ink-testing-library 4 smoke test", () => {
  it("renders a Text component and lastFrame returns the expected string", () => {
    const { lastFrame } = render(<SmokeApp />);
    expect(lastFrame()).toContain("Hello, count: 0");
  });

  it("single keypress fires useInput handler exactly once (no double-fire under React 19)", async () => {
    const { stdin, lastFrame } = render(<SmokeApp />);
    stdin.write("a");
    // Phase 2 hoists the microtask yield into flushFrame() (D-22). The original
    // Phase 1 comment applies: React 19 + Ink 7 flush setState → re-render on
    // the next microtask, not synchronously from stdin.write.
    await flushFrame();
    expect(lastFrame()).toContain("count: 1");
    // Explicitly guard against the double-fire we're here to detect.
    expect(lastFrame()).not.toContain("count: 2");
  });
});
