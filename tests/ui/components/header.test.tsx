import { Text } from "ink";
import { describe, expect, it } from "vitest";
import { Header } from "../../../src/ui/components/Header.js";
import { renderWithPipeline } from "../helpers.js";

describe("Header", () => {
  it("renders SOL chain glyph", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      initialClock: new Date(2026, 3, 17, 14, 32, 7),
      children: <Header />,
    });
    expect(lastFrame() ?? "").toContain("◎ SOL");
  });

  it("renders BSC chain label", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "bsc",
      initialClock: new Date(2026, 3, 17, 14, 32, 7),
      children: <Header />,
    });
    expect(lastFrame() ?? "").toContain("BSC");
  });

  it("renders BASE chain label", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "base",
      initialClock: new Date(2026, 3, 17, 14, 32, 7),
      children: <Header />,
    });
    expect(lastFrame() ?? "").toContain("BASE");
  });

  it("shows • ok when rate-limit status is ok", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      initialClock: new Date(2026, 3, 17, 14, 32, 7),
      initialRateLimitStatus: "ok",
      children: <Header />,
    });
    expect(lastFrame() ?? "").toContain("• ok");
  });

  it("shows • rate-limited when rate-limit status is rate-limited", () => {
    const { lastFrame } = renderWithPipeline({
      chain: "sol",
      initialClock: new Date(2026, 3, 17, 14, 32, 7),
      initialRateLimitStatus: "rate-limited",
      children: <Header />,
    });
    expect(lastFrame() ?? "").toContain("rate-limited");
  });

  // Sanity: avoid unused import warning from Text in case of future growth.
  it("imports ink correctly (sanity)", () => {
    expect(Text).toBeDefined();
  });
});
