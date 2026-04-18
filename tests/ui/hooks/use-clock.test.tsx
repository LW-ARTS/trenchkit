import { Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { describe, expect, it } from "vitest";
import { useClock } from "../../../src/ui/hooks/useClock.js";
import { renderWithPipeline } from "../helpers.js";

function Display(): React.ReactElement {
  const c = useClock();
  return <Text>clk:{c.getTime()}</Text>;
}

describe("useClock", () => {
  it("returns the initial clock value from Context", () => {
    const fixed = new Date(1_234_567_890);
    const { lastFrame } = renderWithPipeline({
      initialClock: fixed,
      children: <Display />,
    });
    expect(lastFrame()).toContain("clk:1234567890");
  });

  it("throws when used outside PipelineProvider", () => {
    let captured: Error | null = null;
    function Trap(): React.ReactElement | null {
      try {
        // biome-ignore lint/correctness/useHookAtTopLevel: exercising throw guard
        useClock();
      } catch (e) {
        captured = e as Error;
      }
      return null;
    }
    render(<Trap />);
    expect(captured).not.toBeNull();
    expect((captured as unknown as Error).message).toMatch(
      /useClock must be used inside PipelineProvider/,
    );
  });
});
