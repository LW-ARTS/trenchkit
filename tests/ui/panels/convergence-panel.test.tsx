import { describe, expect, it } from "vitest";
import type { ConvergenceAlert } from "../../../src/modules/smart-money.js";
import { ConvergencePanel } from "../../../src/ui/panels/ConvergencePanel.js";
import { renderWithShell } from "../helpers.js";

function makeAlert(overrides: Partial<ConvergenceAlert> = {}): ConvergenceAlert {
  return {
    tokenAddress: "So11111111111111111111111111111111111111112",
    chain: "sol",
    walletCount: 4,
    trades: [],
    strength: 80,
    signalLevel: "STRONG",
    isDivergence: false,
    detectedAt: Math.floor(new Date(Date.UTC(2026, 3, 17, 14, 32)).getTime() / 1000),
    ...overrides,
  };
}

describe("ConvergencePanel", () => {
  it("renders empty state when no alerts present", () => {
    const { lastFrame } = renderWithShell({
      initialConvergence: [],
      children: <ConvergencePanel />,
    });
    expect(lastFrame() ?? "").toContain("Awaiting convergence");
  });

  it("renders alerts with strength label and column headers", () => {
    const alerts: ConvergenceAlert[] = [makeAlert({ signalLevel: "STRONG", walletCount: 4 })];
    const { lastFrame } = renderWithShell({
      initialConvergence: alerts,
      children: <ConvergencePanel />,
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("CONVERGENCE");
    expect(frame).toContain("STRONG");
    expect(frame).toContain("Strength");
    expect(frame).toContain("Wallets");
  });

  it("derives signal level from numeric strength when signalLevel is undefined", () => {
    // Simulate the legacy event-payload-only case where the convergence slice carries
    // only {tokenAddress, chain, strength} subsets — signalLevel is undefined
    // at runtime even though the type says non-optional.
    const baseAlert = makeAlert({ strength: 90 });
    const alert = {
      tokenAddress: baseAlert.tokenAddress,
      chain: baseAlert.chain,
      strength: baseAlert.strength,
    } as unknown as ConvergenceAlert;
    const { lastFrame } = renderWithShell({
      initialConvergence: [alert],
      children: <ConvergencePanel />,
    });
    expect(lastFrame() ?? "").toContain("VERY_STRONG");
  });

  it("renders multiple alerts up to row capacity", () => {
    const alerts: ConvergenceAlert[] = [
      makeAlert({ tokenAddress: "AAA1AAA1AAA1AAA1AAA1AAA1AAA1AAA1AA", strength: 10 }),
      makeAlert({ tokenAddress: "BBB2BBB2BBB2BBB2BBB2BBB2BBB2BBB2BB", strength: 70 }),
    ];
    const { lastFrame } = renderWithShell({
      initialConvergence: alerts,
      children: <ConvergencePanel />,
    });
    const frame = lastFrame() ?? "";
    // Both should appear (truncated forms via truncateAddress)
    expect(frame).toContain("AAA1");
    expect(frame).toContain("BBB2");
  });
});
