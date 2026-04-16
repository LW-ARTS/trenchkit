import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyTokenAnalysis } from "../../../src/foundation/types.js";

// Mock all 6 scorer modules so we fully control their return values
vi.mock("../../../src/engine/scorers/security.js", () => ({
  scoreSecurityDimension: vi.fn(() => 80),
}));
vi.mock("../../../src/engine/scorers/holder-quality.js", () => ({
  scoreHolderQualityDimension: vi.fn(() => 80),
}));
vi.mock("../../../src/engine/scorers/liquidity.js", () => ({
  scoreLiquidityDimension: vi.fn(() => 80),
}));
vi.mock("../../../src/engine/scorers/dev-trust.js", () => ({
  scoreDevTrustDimension: vi.fn(() => 80),
}));
vi.mock("../../../src/engine/scorers/smart-money.js", () => ({
  scoreSmartMoneyDimension: vi.fn(() => 80),
}));
vi.mock("../../../src/engine/scorers/bot-manipulation.js", () => ({
  scoreBotManipulationDimension: vi.fn(() => 80),
}));

// Import aggregator AFTER mocks are hoisted
const { calculateConviction } = await import("../../../src/engine/scorers/index.js");

// Import mock references so we can override per-test
const { scoreSecurityDimension } = await import("../../../src/engine/scorers/security.js");
const { scoreHolderQualityDimension } = await import(
  "../../../src/engine/scorers/holder-quality.js"
);
const { scoreLiquidityDimension } = await import("../../../src/engine/scorers/liquidity.js");
const { scoreDevTrustDimension } = await import("../../../src/engine/scorers/dev-trust.js");
const { scoreSmartMoneyDimension } = await import("../../../src/engine/scorers/smart-money.js");
const { scoreBotManipulationDimension } = await import(
  "../../../src/engine/scorers/bot-manipulation.js"
);

beforeEach(() => {
  vi.mocked(scoreSecurityDimension).mockReturnValue(80);
  vi.mocked(scoreHolderQualityDimension).mockReturnValue(80);
  vi.mocked(scoreLiquidityDimension).mockReturnValue(80);
  vi.mocked(scoreDevTrustDimension).mockReturnValue(80);
  vi.mocked(scoreSmartMoneyDimension).mockReturnValue(80);
  vi.mocked(scoreBotManipulationDimension).mockReturnValue(80);
});

describe("calculateConviction", () => {
  it("all dimensions present: weighted sum equals 80", () => {
    // weights: 0.20 + 0.25 + 0.15 + 0.15 + 0.15 + 0.10 = 1.0
    // all return 80, so weighted sum = 80 * 1.0 = 80
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionScore).toBe(80);
  });

  it("weighted average matches formula for varied scores", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(100); // 0.20
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(60); // 0.25
    vi.mocked(scoreLiquidityDimension).mockReturnValue(80); // 0.15
    vi.mocked(scoreDevTrustDimension).mockReturnValue(50); // 0.15
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(40); // 0.15
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(90); // 0.10

    // weighted sum = 100*0.20 + 60*0.25 + 80*0.15 + 50*0.15 + 40*0.15 + 90*0.10
    //             = 20 + 15 + 12 + 7.5 + 6 + 9 = 69.5 => rounded to 70
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionScore).toBe(70);
  });

  it("partial data caps score at 80", () => {
    // All scorers return 100, raw conviction = 100 -> cap at 80 due to partialData
    vi.mocked(scoreSecurityDimension).mockReturnValue(100);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(100);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(100);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(100);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(100);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(100);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.partialData = true;
    const result = calculateConviction(analysis);
    expect(result.convictionScore).toBe(80);
  });

  it("partial data does not cap when score is already below 80", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(60);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(60);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(60);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(60);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(60);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(60);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.partialData = true;
    const result = calculateConviction(analysis);
    expect(result.convictionScore).toBe(60);
  });

  it("NaN dimension is skipped and weight redistributed", () => {
    // security returns NaN -> weight 0.20 is excluded
    // remaining weights: 0.25 + 0.15 + 0.15 + 0.15 + 0.10 = 0.80
    // all remaining return 80
    // weighted sum = 80 * 0.80 / 0.80 = 80
    vi.mocked(scoreSecurityDimension).mockReturnValue(Number.NaN);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionScore).toBe(80);
    // security dimension should be absent from dimensionScores
    expect(result.dimensionScores).toBeDefined();
    expect(result.dimensionScores).not.toHaveProperty("security");
  });

  it("all NaN dimensions produce score of 0", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(Number.NaN);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(Number.NaN);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(Number.NaN);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(Number.NaN);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(Number.NaN);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(Number.NaN);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionScore).toBe(0);
  });

  it("label threshold: score >= 80 = HIGH", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis); // all mocked to 80
    expect(result.convictionLabel).toBe("HIGH");
  });

  it("label threshold: score >= 60 = MODERATE", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(60);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(60);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(60);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(60);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(60);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(60);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionLabel).toBe("MODERATE");
  });

  it("label threshold: score >= 40 = LOW", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(40);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(40);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(40);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(40);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(40);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(40);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionLabel).toBe("LOW");
  });

  it("label threshold: score < 40 = AVOID", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(20);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(20);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(20);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(20);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(20);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(20);

    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    const result = calculateConviction(analysis);
    expect(result.convictionLabel).toBe("AVOID");
  });

  it("empty/null analysis does not crash (produces a score)", () => {
    vi.mocked(scoreSecurityDimension).mockReturnValue(50);
    vi.mocked(scoreHolderQualityDimension).mockReturnValue(50);
    vi.mocked(scoreLiquidityDimension).mockReturnValue(50);
    vi.mocked(scoreDevTrustDimension).mockReturnValue(50);
    vi.mocked(scoreSmartMoneyDimension).mockReturnValue(50);
    vi.mocked(scoreBotManipulationDimension).mockReturnValue(50);

    // Totally empty analysis (all nulls)
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    expect(() => calculateConviction(analysis)).not.toThrow();
    const result = calculateConviction(analysis);
    expect(typeof result.convictionScore).toBe("number");
    expect(result.convictionLabel).toBeDefined();
  });

  it("result preserves all original analysis fields", () => {
    const analysis = createEmptyTokenAnalysis("0xabc", "bsc");
    analysis.symbol = "TEST";
    analysis.marketCap = 500_000;
    const result = calculateConviction(analysis);
    expect(result.address).toBe("0xabc");
    expect(result.chain).toBe("bsc");
    expect(result.symbol).toBe("TEST");
    expect(result.marketCap).toBe(500_000);
  });
});
