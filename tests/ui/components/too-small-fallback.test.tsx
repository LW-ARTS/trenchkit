import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { TooSmallFallback } from "../../../src/ui/components/TooSmallFallback.js";

describe("TooSmallFallback", () => {
  it("renders the resize prompt with 100×30 minimum", () => {
    const { lastFrame } = render(<TooSmallFallback />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("100");
    expect(frame).toContain("30");
    expect(frame.toLowerCase()).toContain("resize");
  });

  it("renders the current terminal dimensions in the dim line", () => {
    const { lastFrame } = render(<TooSmallFallback />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("current:");
  });
});
