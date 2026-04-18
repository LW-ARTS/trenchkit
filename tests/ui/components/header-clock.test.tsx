import { describe, expect, it } from "vitest";
import { HeaderClock } from "../../../src/ui/components/HeaderClock.js";
import { renderWithPipeline } from "../helpers.js";

describe("HeaderClock", () => {
  it("renders HH:MM:SS from useClock()", () => {
    const fixed = new Date(2026, 3, 17, 14, 32, 7);
    const { lastFrame } = renderWithPipeline({
      initialClock: fixed,
      children: <HeaderClock />,
    });
    expect(lastFrame() ?? "").toContain("14:32:07");
  });

  it("pads single-digit values with leading zeros", () => {
    const fixed = new Date(2026, 3, 17, 3, 7, 9);
    const { lastFrame } = renderWithPipeline({
      initialClock: fixed,
      children: <HeaderClock />,
    });
    expect(lastFrame() ?? "").toContain("03:07:09");
  });

  it("handles midnight (00:00:00)", () => {
    const fixed = new Date(2026, 3, 17, 0, 0, 0);
    const { lastFrame } = renderWithPipeline({
      initialClock: fixed,
      children: <HeaderClock />,
    });
    expect(lastFrame() ?? "").toContain("00:00:00");
  });
});
