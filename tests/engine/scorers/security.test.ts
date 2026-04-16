import { describe, expect, it } from "vitest";
import { scoreSecurityDimension } from "../../../src/engine/scorers/security.js";
import { createEmptyTokenAnalysis } from "../../../src/foundation/types.js";

describe("scoreSecurityDimension", () => {
  it("honeypot on EVM chain returns 0 (early return)", () => {
    const analysis = createEmptyTokenAnalysis("0xabc", "bsc");
    analysis.isHoneypot = true;
    expect(scoreSecurityDimension(analysis)).toBe(0);
  });

  it("honeypot field ignored on SOL chain (not applicable)", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.isHoneypot = true;
    // SOL has honeypot: false in applicableSecurityFields, so no kill
    expect(scoreSecurityDimension(analysis)).toBe(100);
  });

  it("unrenounced owner penalizes -30", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.isRenounced = false;
    expect(scoreSecurityDimension(analysis)).toBe(70);
  });

  it("active freeze authority on SOL penalizes -15", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.isFreezeAuthorityRenounced = false;
    expect(scoreSecurityDimension(analysis)).toBe(85);
  });

  it("active mint authority on SOL penalizes -25", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.isMintAuthorityRenounced = false;
    expect(scoreSecurityDimension(analysis)).toBe(75);
  });

  it("high rug_ratio penalizes proportionally", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.rugRatio = 0.5; // 0.5 > 0.3 threshold, penalty = 0.5 * 60 = 30
    expect(scoreSecurityDimension(analysis)).toBe(70);
  });

  it("burn ratio gives +10 bonus, clamped to 100", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.burnRatio = 0.1;
    expect(scoreSecurityDimension(analysis)).toBe(100);
  });

  it("score is always clamped to 0-100", () => {
    const analysis = createEmptyTokenAnalysis("0xabc", "bsc");
    analysis.isRenounced = false;
    analysis.buyTax = 0.9; // -30 + -(0.9 * 200) = huge negative
    analysis.sellTax = 0.9;
    analysis.rugRatio = 1.0;
    const score = scoreSecurityDimension(analysis);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("full green token (renounced, no tax, low rug) scores 100", () => {
    const analysis = createEmptyTokenAnalysis("0xabc", "bsc");
    analysis.isRenounced = true;
    analysis.buyTax = 0.01; // below 0.05 threshold
    analysis.sellTax = 0.01;
    analysis.rugRatio = 0.1; // below 0.3 threshold
    expect(scoreSecurityDimension(analysis)).toBe(100);
  });
});
