import { Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { describe, expect, it } from "vitest";
import type { ConvergenceAlert } from "../../../src/modules/smart-money.js";
import { useConvergence } from "../../../src/ui/hooks/useConvergence.js";
import { renderWithPipeline } from "../helpers.js";

function makeAlert(tokenAddress: string): ConvergenceAlert {
  return {
    tokenAddress,
    chain: "sol",
    walletCount: 2,
    trades: [],
    strength: 70,
    signalLevel: "STRONG",
    isDivergence: false,
    detectedAt: 1_000_000,
  };
}

function Display(): React.ReactElement {
  const c = useConvergence();
  return <Text>cv:{c.length}</Text>;
}

describe("useConvergence", () => {
  it("returns the initial convergence slice from Context", () => {
    const { lastFrame } = renderWithPipeline({
      initialConvergence: [makeAlert("T1"), makeAlert("T2")],
      children: <Display />,
    });
    expect(lastFrame()).toContain("cv:2");
  });

  it("returns an empty array when slice has no alerts", () => {
    const { lastFrame } = renderWithPipeline({
      initialConvergence: [],
      children: <Display />,
    });
    expect(lastFrame()).toContain("cv:0");
  });

  it("throws when used outside PipelineProvider", () => {
    let captured: Error | null = null;
    function Trap(): React.ReactElement | null {
      try {
        // biome-ignore lint/correctness/useHookAtTopLevel: exercising throw guard
        useConvergence();
      } catch (e) {
        captured = e as Error;
      }
      return null;
    }
    render(<Trap />);
    expect(captured).not.toBeNull();
    expect((captured as unknown as Error).message).toMatch(
      /useConvergence must be used inside PipelineProvider/,
    );
  });
});
