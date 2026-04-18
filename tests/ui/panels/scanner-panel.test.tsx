import { describe, expect, it } from "vitest";
import { createEmptyTokenAnalysis, type TokenAnalysis } from "../../../src/foundation/types.js";
import { ScannerPanel } from "../../../src/ui/panels/ScannerPanel.js";
import { renderWithShell } from "../helpers.js";

function makeToken(address: string, overrides: Partial<TokenAnalysis> = {}): TokenAnalysis {
  return { ...createEmptyTokenAnalysis(address, "sol"), ...overrides };
}

describe("ScannerPanel", () => {
  it("renders loading state when slice is null", () => {
    const { lastFrame } = renderWithShell({
      initialScanner: null,
      children: <ScannerPanel />,
    });
    expect(lastFrame() ?? "").toContain("scanning");
  });

  it("renders empty state when slice is empty", () => {
    const { lastFrame } = renderWithShell({
      initialScanner: [],
      children: <ScannerPanel />,
    });
    expect(lastFrame() ?? "").toContain("No qualified tokens yet");
  });

  it("renders token rows with symbol and conviction score", () => {
    const tokens: TokenAnalysis[] = [
      makeToken("So11111111111111111111111111111111111111112", {
        symbol: "$POO",
        convictionScore: 87,
        marketCap: 269_000,
        liquidity: 45_000,
        holderCount: 128,
      }),
    ];
    const { lastFrame } = renderWithShell({
      initialScanner: tokens,
      children: <ScannerPanel />,
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("SCANNER");
    expect(frame).toContain("$POO");
    expect(frame).toContain("87");
    expect(frame).toContain("128");
  });

  it("includes column header row", () => {
    const tokens: TokenAnalysis[] = [makeToken("AAA", { symbol: "$X", convictionScore: 1 })];
    const { lastFrame } = renderWithShell({
      initialScanner: tokens,
      children: <ScannerPanel />,
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Symbol");
    expect(frame).toContain("Score");
    expect(frame).toContain("Holders");
  });
});
