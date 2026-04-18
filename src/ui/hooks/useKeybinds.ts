import { useApp, useInput } from "ink";
import { useFocus } from "../providers/FocusProvider.js";
import { useModal } from "../providers/ModalProvider.js";
import { useActions } from "./useActions.js";

/**
 * Global keyboard routing for the dashboard (D-05, D-08, T/W/R/S/Q).
 *
 * - While a modal is open (`active !== "none"`), this hook returns early so the
 *   modal's TextInput.useInput handles keys. Ink broadcasts input to all
 *   mounted handlers; consolidating dispatch here keeps intent clear.
 * - S → triggerScan, W/R/T → open corresponding modal, Q → useApp().exit().
 * - Tab → cycleFocus, arrows → focus+row-selection (up at row 0 crosses to
 *   the spatial neighbor; otherwise decrements selection within panel).
 * - Enter is reserved for research drill-down (D-08) — wiring deferred to
 *   plan 03-03 where row→address resolution lives with the panel slices.
 */
export function useKeybinds(): void {
  const { exit } = useApp();
  const { active, open } = useModal();
  const { cycleFocus, moveFocus, focusedPanel, selectedRow, setSelectedRow } = useFocus();
  const actions = useActions();

  useInput((input, key) => {
    // Modal absorbs input — skip global routing.
    if (active !== "none") return;

    if (input === "q" || input === "Q") {
      exit();
      return;
    }
    if (input === "s" || input === "S") {
      void actions.triggerScan();
      return;
    }
    if (input === "w" || input === "W") {
      open("wallet");
      return;
    }
    if (input === "r" || input === "R") {
      open("research");
      return;
    }
    if (input === "t" || input === "T") {
      open("trade");
      return;
    }

    if (key.tab) {
      cycleFocus();
      return;
    }

    if (key.upArrow) {
      const currentRow = selectedRow[focusedPanel];
      if (currentRow === 0) {
        moveFocus("up");
      } else {
        setSelectedRow(focusedPanel, currentRow - 1);
      }
      return;
    }

    if (key.downArrow) {
      const currentRow = selectedRow[focusedPanel];
      setSelectedRow(focusedPanel, currentRow + 1);
      return;
    }

    if (key.leftArrow) {
      moveFocus("left");
      return;
    }
    if (key.rightArrow) {
      moveFocus("right");
      return;
    }

    if (key.return) {
      // Enter: drill into selected row — wired in plan 03-03.
      // Intentionally empty for this plan (D-08 scope).
    }
  });
}
