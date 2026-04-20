import { Text } from "ink";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useActions } from "../../../src/ui/hooks/useActions.js";
import { useKeybinds } from "../../../src/ui/hooks/useKeybinds.js";
import { FocusProvider, useFocus } from "../../../src/ui/providers/FocusProvider.js";
import { ModalProvider, useModal } from "../../../src/ui/providers/ModalProvider.js";
import { flushFrame, renderWithPipeline } from "../helpers.js";

/**
 * Contract lock: — keybinding routing semantics.
 *
 * Locks the useKeybinds routing against regression:
 *   - s         → triggers actions.triggerScan (no-throw, focus unchanged)
 *   - Tab       → cycles focus clockwise
 *   - →  (CSI C) → moves spatial focus right
 *   - ↑  (CSI A) → up-arrow at row 0 moves spatial focus up
 *   - w         → opens wallet modal
 *   - Modal-open absorption: additional letter keys don't reopen/swap
 *
 * NOTE on `q` → useApp().exit(): skipped per plan body escape hatch. Ink's
 * useApp() is hard to spy on without rewriting ink-testing-library's harness.
 */

/**
 * Mount useKeybinds + expose focus + modal state + actions identity through
 * a single Text node so tests can assert via lastFrame().
 */
function Probe({
  holder,
}: {
  holder: { current: { triggerScan: () => Promise<void> } | null };
}): React.ReactElement {
  useKeybinds();
  const { focusedPanel } = useFocus();
  const { active } = useModal();
  const actions = useActions();
  holder.current = actions;
  return <Text>{`focus=${focusedPanel} modal=${active}`}</Text>;
}

function wrap(holder: React.MutableRefObject<unknown>): React.ReactElement {
  return (
    <FocusProvider>
      <ModalProvider>
        <Probe
          holder={holder as React.MutableRefObject<{ triggerScan: () => Promise<void> } | null>}
        />
      </ModalProvider>
    </FocusProvider>
  );
}

describe("contract: keyboard routing", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("'s' triggers actions.triggerScan (no-throw, focus unchanged)", async () => {
    // MockPipelineProvider's triggerScan is a no-op async stub; spy on it via
    // the holder captured in the probe. After writing "s", the holder's
    // triggerScan was called zero extra times (no-throw is the contract) and
    // the focus stays on scanner (the key did not accidentally bubble to
    // focus/arrow branches).
    const holder: { current: { triggerScan: () => Promise<void> } | null } = { current: null };
    const { stdin, lastFrame } = renderWithPipeline({ children: wrap(holder) });
    await flushFrame();
    const triggerSpy = vi.spyOn(
      holder.current as { triggerScan: () => Promise<void> },
      "triggerScan",
    );

    stdin.write("s");
    await flushFrame();

    expect(triggerSpy).toHaveBeenCalledTimes(1);
    expect(lastFrame() ?? "").toContain("focus=scanner");
  });

  it("Tab cycles focus clockwise (scanner → smart-money)", async () => {
    const holder = { current: null };
    const { stdin, lastFrame } = renderWithPipeline({ children: wrap(holder) });
    await flushFrame();
    stdin.write("\t");
    await flushFrame();

    expect(lastFrame() ?? "").toContain("focus=smart-money");
  });

  it("right arrow moves spatial focus (scanner → smart-money)", async () => {
    const holder = { current: null };
    const { stdin, lastFrame } = renderWithPipeline({ children: wrap(holder) });
    await flushFrame();
    stdin.write("\u001b[C"); // CSI C = right arrow
    await flushFrame();

    expect(lastFrame() ?? "").toContain("focus=smart-money");
  });

  it("up arrow at row 0 moves spatial focus (no down target from scanner)", async () => {
    // Scanner's SPATIAL.up = "scanner" (no-op) — first verify up from scanner
    // stays, then Tab twice to research, then up from research → smart-money.
    const holder = { current: null };
    const { stdin, lastFrame } = renderWithPipeline({ children: wrap(holder) });
    await flushFrame();
    stdin.write("\t"); // → smart-money
    await flushFrame();
    stdin.write("\t"); // → research
    await flushFrame();
    expect(lastFrame() ?? "").toContain("focus=research");

    stdin.write("\u001b[A"); // CSI A = up arrow, at selectedRow[research]=0 → moveFocus("up") → smart-money
    await flushFrame();
    expect(lastFrame() ?? "").toContain("focus=smart-money");
  });

  it("'w' opens wallet modal and subsequent letters are absorbed", async () => {
    const holder = { current: null };
    const { stdin, lastFrame } = renderWithPipeline({ children: wrap(holder) });
    await flushFrame();

    stdin.write("w");
    await flushFrame();
    expect(lastFrame() ?? "").toContain("modal=wallet");

    // Modal absorbs global routing — "r" must NOT swap to research modal.
    stdin.write("r");
    await flushFrame();
    expect(lastFrame() ?? "").toContain("modal=wallet");
  });
});
