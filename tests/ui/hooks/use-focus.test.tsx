import { Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { describe, expect, it } from "vitest";
import {
  type FocusContextValue,
  FocusProvider,
  type PanelId,
  useFocus,
} from "../../../src/ui/providers/FocusProvider.js";
import { flushFrame } from "../helpers.js";

/**
 * Capture the live FocusContextValue into a holder ref via a probe component.
 * The holder is overwritten on every render so reads always see the freshest
 * value (after `await flushFrame()` post-setter).
 */
function makeHolder(): { current: FocusContextValue | null } {
  return { current: null };
}

function FocusProbe({
  holder,
}: {
  holder: { current: FocusContextValue | null };
}): React.ReactElement {
  const ctx = useFocus();
  holder.current = ctx;
  return (
    <Text>
      {ctx.focusedPanel}|s:{ctx.selectedRow.scanner}|sm:{ctx.selectedRow["smart-money"]}|c:
      {ctx.selectedRow.convergence}|r:{ctx.selectedRow.research}
    </Text>
  );
}

describe("useFocus", () => {
  it("starts with scanner focused and all selectedRow at 0", () => {
    const holder = makeHolder();
    const { lastFrame } = render(
      <FocusProvider>
        <FocusProbe holder={holder} />
      </FocusProvider>,
    );
    expect(holder.current).not.toBeNull();
    expect(holder.current?.focusedPanel).toBe<PanelId>("scanner");
    expect(holder.current?.selectedRow.scanner).toBe(0);
    expect(holder.current?.selectedRow["smart-money"]).toBe(0);
    expect(holder.current?.selectedRow.convergence).toBe(0);
    expect(holder.current?.selectedRow.research).toBe(0);
    expect(lastFrame() ?? "").toContain("scanner");
  });

  it("cycleFocus cycles clockwise scanner → smart-money → research → convergence → scanner", async () => {
    const holder = makeHolder();
    render(
      <FocusProvider>
        <FocusProbe holder={holder} />
      </FocusProvider>,
    );
    const sequence: PanelId[] = [];
    for (let i = 0; i < 4; i++) {
      holder.current?.cycleFocus();
      await flushFrame();
      sequence.push(holder.current?.focusedPanel as PanelId);
    }
    expect(sequence).toEqual<PanelId[]>(["smart-money", "research", "convergence", "scanner"]);
  });

  it("moveFocus walks spatial neighbors in a 2x2 grid", async () => {
    const holder = makeHolder();
    render(
      <FocusProvider>
        <FocusProbe holder={holder} />
      </FocusProvider>,
    );
    // scanner (TL) -> down -> convergence (BL)
    holder.current?.moveFocus("down");
    await flushFrame();
    expect(holder.current?.focusedPanel).toBe<PanelId>("convergence");
    // convergence (BL) -> right -> research (BR)
    holder.current?.moveFocus("right");
    await flushFrame();
    expect(holder.current?.focusedPanel).toBe<PanelId>("research");
    // research (BR) -> up -> smart-money (TR)
    holder.current?.moveFocus("up");
    await flushFrame();
    expect(holder.current?.focusedPanel).toBe<PanelId>("smart-money");
    // smart-money (TR) -> left -> scanner (TL)
    holder.current?.moveFocus("left");
    await flushFrame();
    expect(holder.current?.focusedPanel).toBe<PanelId>("scanner");
  });

  it("setSelectedRow clamps negative indices to 0", async () => {
    const holder = makeHolder();
    render(
      <FocusProvider>
        <FocusProbe holder={holder} />
      </FocusProvider>,
    );
    holder.current?.setSelectedRow("scanner", -5);
    await flushFrame();
    expect(holder.current?.selectedRow.scanner).toBe(0);
    holder.current?.setSelectedRow("scanner", 4);
    await flushFrame();
    expect(holder.current?.selectedRow.scanner).toBe(4);
    holder.current?.setSelectedRow("scanner", -1);
    await flushFrame();
    expect(holder.current?.selectedRow.scanner).toBe(0);
  });

  it("throws when used outside FocusProvider", () => {
    let captured: Error | null = null;
    function Trap(): React.ReactElement | null {
      try {
        // biome-ignore lint/correctness/useHookAtTopLevel: exercising throw guard
        useFocus();
      } catch (e) {
        captured = e as Error;
      }
      return null;
    }
    render(<Trap />);
    expect(captured).not.toBeNull();
    expect((captured as unknown as Error).message).toMatch(
      /useFocus must be used inside FocusProvider/,
    );
  });
});
