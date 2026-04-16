import { describe, expect, it } from "vitest";
import { scoreDevTrustDimension } from "../../../src/engine/scorers/dev-trust.js";
import { createEmptyTokenAnalysis } from "../../../src/foundation/types.js";

describe("scoreDevTrustDimension - no dev history", () => {
  it("no dev history (0 tokens created) = 50 (neutral)", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 0;
    analysis.creatorInnerCount = 0;
    expect(scoreDevTrustDimension(analysis)).toBe(50);
  });

  it("null counts treated as 0 = 50 (neutral)", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    // all creator fields remain null
    expect(scoreDevTrustDimension(analysis)).toBe(50);
  });
});

describe("scoreDevTrustDimension - graduation rate", () => {
  it("high graduation rate (0.8) = ~80", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 4;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = 0.8;
    expect(scoreDevTrustDimension(analysis)).toBeCloseTo(80);
  });

  it("low graduation rate with many tokens (>5, <10% grad) = heavy penalty", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 6;
    analysis.creatorInnerCount = 2;
    analysis.creatorOpenRatio = 0.05;
    // score = 0.05 * 100 = 5, then -30 for low grad + many tokens = -25, clamped to 0
    expect(scoreDevTrustDimension(analysis)).toBe(0);
  });

  it("null graduation rate treated as 0", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 3;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = null;
    // score = 0 * 100 = 0
    expect(scoreDevTrustDimension(analysis)).toBe(0);
  });
});

describe("scoreDevTrustDimension - serial launcher", () => {
  it("serial launcher (>20 tokens) gets -20 penalty", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 15;
    analysis.creatorInnerCount = 10;
    analysis.creatorOpenRatio = 0.5;
    // score = 50 - 20 (serial) - 0 (grad >= 0.1) = 30
    expect(scoreDevTrustDimension(analysis)).toBe(30);
  });

  it("exactly 20 tokens does not trigger serial launcher penalty", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 15;
    analysis.creatorInnerCount = 5;
    analysis.creatorOpenRatio = 0.5;
    // totalCreated = 20, not > 20, so no serial penalty
    expect(scoreDevTrustDimension(analysis)).toBe(50);
  });
});

describe("scoreDevTrustDimension - dev ATH bonus", () => {
  it("dev with >$1M ATH MC gets +15 bonus", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 3;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = 0.5;
    analysis.devAthMc = 2_000_000;
    // score = 50 + 15 = 65
    expect(scoreDevTrustDimension(analysis)).toBe(65);
  });

  it("dev with exactly $1M ATH MC does not get bonus", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 3;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = 0.5;
    analysis.devAthMc = 1_000_000;
    // not > 1M, no bonus
    expect(scoreDevTrustDimension(analysis)).toBe(50);
  });

  it("null devAthMc does not give bonus", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 3;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = 0.5;
    analysis.devAthMc = null;
    expect(scoreDevTrustDimension(analysis)).toBe(50);
  });
});

describe("scoreDevTrustDimension - NaN guard", () => {
  it("NaN in creatorOpenRatio is treated as 0", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 3;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = Number.NaN;
    // NaN guarded to 0, score = 0
    expect(scoreDevTrustDimension(analysis)).toBe(0);
  });
});

describe("scoreDevTrustDimension - score bounds", () => {
  it("score is always >= 0", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 30;
    analysis.creatorInnerCount = 10;
    analysis.creatorOpenRatio = 0.01;
    // score = 1 - 20 (serial) - 30 (low grad + many) = -49, clamped to 0
    expect(scoreDevTrustDimension(analysis)).toBeGreaterThanOrEqual(0);
  });

  it("score is always <= 100", () => {
    const analysis = createEmptyTokenAnalysis("addr", "sol");
    analysis.creatorOpenCount = 3;
    analysis.creatorInnerCount = 1;
    analysis.creatorOpenRatio = 1.0;
    analysis.devAthMc = 5_000_000;
    // score = 100 + 15 = 115, clamped to 100
    expect(scoreDevTrustDimension(analysis)).toBeLessThanOrEqual(100);
  });
});
