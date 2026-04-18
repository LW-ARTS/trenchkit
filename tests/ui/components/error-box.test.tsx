import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { ErrorBox } from "../../../src/ui/components/ErrorBox.js";

describe("ErrorBox", () => {
  it("renders headline and message", () => {
    const { lastFrame } = render(<ErrorBox message="something went wrong" />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("⚠ panel unavailable");
    expect(frame).toContain("something went wrong");
  });

  it("truncates messages longer than 120 chars with ellipsis", () => {
    const longMsg = "x".repeat(500);
    const { lastFrame } = render(<ErrorBox message={longMsg} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("…");
    expect(frame).not.toContain("x".repeat(500));
  });

  it("renders short messages unchanged (no ellipsis)", () => {
    const { lastFrame } = render(<ErrorBox message="short error" />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("short error");
    expect(frame).not.toContain("…");
  });
});
