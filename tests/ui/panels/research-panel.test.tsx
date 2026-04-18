import { describe, expect, it } from "vitest";
import { createEmptyTokenAnalysis, type TokenAnalysis } from "../../../src/foundation/types.js";
import { ResearchPanel } from "../../../src/ui/panels/ResearchPanel.js";
import { flushFrame, renderWithShell } from "../helpers.js";

function makeAnalysis(address: string, overrides: Partial<TokenAnalysis> = {}): TokenAnalysis {
  return { ...createEmptyTokenAnalysis(address, "sol"), ...overrides };
}

describe("ResearchPanel", () => {
  it("renders loading/empty state when no research has landed", () => {
    const { lastFrame } = renderWithShell({
      initialResearch: null,
      children: <ResearchPanel />,
    });
    // No research seeded => local feed empty => "No recent research"
    expect(lastFrame() ?? "").toContain("No recent research");
  });

  it("accumulates a feed entry from initialResearch and renders symbol + conviction", async () => {
    const analysis = makeAnalysis("So11111111111111111111111111111111111111112", {
      symbol: "$POO",
      convictionScore: 87,
      convictionLabel: "HIGH",
    });
    const { lastFrame } = renderWithShell({
      initialResearch: analysis,
      children: <ResearchPanel />,
    });
    // useEffect runs after render — flush a frame so the local feed populates.
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("RESEARCH");
    expect(frame).toContain("$POO");
    expect(frame).toContain("87");
    expect(frame).toContain("HIGH");
  });

  it("includes column header row", async () => {
    const analysis = makeAnalysis("AAA", { symbol: "$X", convictionScore: 1 });
    const { lastFrame } = renderWithShell({
      initialResearch: analysis,
      children: <ResearchPanel />,
    });
    await flushFrame();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Token");
    expect(frame).toContain("Score");
    expect(frame).toContain("Conviction");
  });

  it("renders RESEARCH header even when feed is empty", () => {
    const { lastFrame } = renderWithShell({
      initialResearch: null,
      children: <ResearchPanel />,
    });
    expect(lastFrame() ?? "").toContain("RESEARCH");
  });
});
