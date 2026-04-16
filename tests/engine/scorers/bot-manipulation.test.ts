import { describe, expect, it } from "vitest";
import { scoreBotManipulationDimension } from "../../../src/engine/scorers/bot-manipulation.js";
import { createEmptyTokenAnalysis } from "../../../src/foundation/types.js";

describe("scoreBotManipulationDimension", () => {
  it("clean token (all 0) = 100", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.botDegenRate = 0;
    analysis.bundlerRate = 0;
    analysis.ratTraderRate = 0;
    analysis.sniperCount = 0;
    analysis.privateVaultHoldRate = 0;
    expect(scoreBotManipulationDimension(analysis)).toBe(100);
  });

  it("high bot_degen_rate (0.5) = 100 - 40 = 60", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.botDegenRate = 0.5; // 0.5 * 80 = 40
    expect(scoreBotManipulationDimension(analysis)).toBe(60);
  });

  it("high bundler_rate (0.5) = 100 - 30 = 70", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.bundlerRate = 0.5; // 0.5 * 60 = 30
    expect(scoreBotManipulationDimension(analysis)).toBe(70);
  });

  it("high rat_trader_rate (0.5) = 100 - 20 = 80", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.ratTraderRate = 0.5; // 0.5 * 40 = 20
    expect(scoreBotManipulationDimension(analysis)).toBe(80);
  });

  it("many snipers (>20) penalizes -15", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.sniperCount = 21;
    expect(scoreBotManipulationDimension(analysis)).toBe(85);
  });

  it("high private_vault_hold_rate (>0.3) penalizes -20", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.privateVaultHoldRate = 0.5;
    expect(scoreBotManipulationDimension(analysis)).toBe(80);
  });

  it("all bad = heavily penalized, clamped to 0", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    analysis.botDegenRate = 1.0; // -80
    analysis.bundlerRate = 1.0; // -60
    analysis.ratTraderRate = 1.0; // -40
    analysis.sniperCount = 50; // -15
    analysis.privateVaultHoldRate = 1.0; // -20
    // 100 - 80 - 60 - 40 - 15 - 20 = -115, clamped to 0
    expect(scoreBotManipulationDimension(analysis)).toBe(0);
  });

  it("all null = 100 (no penalties)", () => {
    const analysis = createEmptyTokenAnalysis("SoLaddr", "sol");
    // All bot fields remain null from createEmptyTokenAnalysis
    expect(scoreBotManipulationDimension(analysis)).toBe(100);
  });
});
