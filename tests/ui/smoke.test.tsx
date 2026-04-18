import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { SmokeApp } from "../../src/ui/smoke.js";

describe("Ink 7 + React 19 + ink-testing-library 4 smoke test", () => {
  it("renders a Text component and lastFrame returns the expected string", () => {
    const { lastFrame } = render(<SmokeApp />);
    expect(lastFrame()).toContain("Hello, count: 0");
  });

  it("single keypress fires useInput handler exactly once (no double-fire under React 19)", async () => {
    const { stdin, lastFrame } = render(<SmokeApp />);
    stdin.write("a");
    // React 19 + Ink 7 flush state asynchronously; yield one microtask so the
    // setState → re-render chain commits before we read lastFrame. Plan's
    // verbatim test body assumed synchronous flush (Rule 3 deviation).
    await new Promise((r) => setImmediate(r));
    expect(lastFrame()).toContain("count: 1");
    // Explicitly guard against the double-fire we're here to detect.
    expect(lastFrame()).not.toContain("count: 2");
  });
});
