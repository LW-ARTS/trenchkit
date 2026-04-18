import { Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { describe, expect, it } from "vitest";
import type { NormalizedTrade } from "../../../src/modules/smart-money.js";
import { useSmartMoney } from "../../../src/ui/hooks/useSmartMoney.js";
import { renderWithPipeline } from "../helpers.js";

function makeTrade(maker: string): NormalizedTrade {
  return {
    maker,
    makerName: null,
    side: "buy",
    amountUsd: 100,
    isFullOpen: false,
    timestamp: 1_000_000,
    source: "smartmoney",
  };
}

function Display(): React.ReactElement {
  const sm = useSmartMoney();
  return <Text>sm:{sm === null ? "null" : sm.length}</Text>;
}

describe("useSmartMoney", () => {
  it("returns the initial smart-money slice from Context", () => {
    const { lastFrame } = renderWithPipeline({
      initialSmartMoney: [makeTrade("W1"), makeTrade("W2"), makeTrade("W3")],
      children: <Display />,
    });
    expect(lastFrame()).toContain("sm:3");
  });

  it("returns null when slice has never loaded", () => {
    const { lastFrame } = renderWithPipeline({
      initialSmartMoney: null,
      children: <Display />,
    });
    expect(lastFrame()).toContain("sm:null");
  });

  it("throws when used outside PipelineProvider", () => {
    let captured: Error | null = null;
    function Trap(): React.ReactElement | null {
      try {
        // biome-ignore lint/correctness/useHookAtTopLevel: exercising throw guard
        useSmartMoney();
      } catch (e) {
        captured = e as Error;
      }
      return null;
    }
    render(<Trap />);
    expect(captured).not.toBeNull();
    expect((captured as unknown as Error).message).toMatch(
      /useSmartMoney must be used inside PipelineProvider/,
    );
  });
});
