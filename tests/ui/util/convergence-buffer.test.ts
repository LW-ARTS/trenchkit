import { describe, expect, it } from "vitest";
import type { ConvergenceAlert } from "../../../src/modules/smart-money.js";
import { MAX_CONVERGENCE, pushConvergence } from "../../../src/ui/util/convergence-buffer.js";

function makeAlert(tokenAddress: string, strength = 50): ConvergenceAlert {
  return {
    tokenAddress,
    chain: "sol",
    walletCount: 2,
    trades: [],
    strength,
    signalLevel: "STRONG",
    isDivergence: false,
    detectedAt: 1_000_000,
  };
}

describe("pushConvergence", () => {
  it("pushes a single alert into an empty buffer", () => {
    const alert = makeAlert("TokenA");
    const next = pushConvergence([], alert);
    expect(next).toHaveLength(1);
    expect(next[0]).toBe(alert);
  });

  it("keeps all 19 entries when pushing into a 18-length buffer (under cap)", () => {
    const buffer: ConvergenceAlert[] = [];
    for (let i = 0; i < 18; i++) {
      buffer.unshift(makeAlert(`Token${i}`));
    }
    const next = pushConvergence(buffer, makeAlert("TokenNew"));
    expect(next).toHaveLength(19);
    expect(next[0]?.tokenAddress).toBe("TokenNew");
  });

  it("keeps exactly 20 entries when pushing 20 unique tokenAddresses", () => {
    let buffer: readonly ConvergenceAlert[] = [];
    for (let i = 0; i < 20; i++) {
      buffer = pushConvergence(buffer, makeAlert(`Token${i}`));
    }
    expect(buffer).toHaveLength(MAX_CONVERGENCE);
    expect(buffer[0]?.tokenAddress).toBe("Token19");
    expect(buffer[19]?.tokenAddress).toBe("Token0");
  });

  it("evicts the oldest entry when pushing a 21st unique tokenAddress", () => {
    let buffer: readonly ConvergenceAlert[] = [];
    for (let i = 0; i < 21; i++) {
      buffer = pushConvergence(buffer, makeAlert(`Token${i}`));
    }
    expect(buffer).toHaveLength(MAX_CONVERGENCE);
    expect(buffer[0]?.tokenAddress).toBe("Token20");
    expect(buffer[19]?.tokenAddress).toBe("Token1");
    // The original Token0 is evicted from the tail
    expect(buffer.some((a) => a.tokenAddress === "Token0")).toBe(false);
  });

  it("dedups by tokenAddress — existing entry removed, fresh prepended with latest strength", () => {
    const first = makeAlert("TokenA", 40);
    const second = makeAlert("TokenB", 55);
    const third = makeAlert("TokenA", 88); // same address as first, higher strength
    let buffer: readonly ConvergenceAlert[] = [];
    buffer = pushConvergence(buffer, first);
    buffer = pushConvergence(buffer, second);
    buffer = pushConvergence(buffer, third);
    expect(buffer).toHaveLength(2);
    expect(buffer[0]?.tokenAddress).toBe("TokenA");
    expect(buffer[0]?.strength).toBe(88);
    expect(buffer[1]?.tokenAddress).toBe("TokenB");
    // The original first entry (strength 40) is gone
    expect(buffer.filter((a) => a.tokenAddress === "TokenA")).toHaveLength(1);
  });

  it("is immutable — original buffer reference is unchanged after push", () => {
    const a1 = makeAlert("TokenA");
    const a2 = makeAlert("TokenB");
    const original: readonly ConvergenceAlert[] = [a1];
    const next = pushConvergence(original, a2);
    // Reference identity check — the original array must not be mutated
    expect(original).toHaveLength(1);
    expect(original[0]).toBe(a1);
    expect(next).not.toBe(original);
    expect(next).toHaveLength(2);
  });
});
