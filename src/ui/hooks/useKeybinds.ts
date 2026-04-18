import { useApp, useInput } from "ink";
import { useFocus } from "../providers/FocusProvider.js";
import { useModal } from "../providers/ModalProvider.js";
import { useActions } from "./useActions.js";
import { useConvergence } from "./useConvergence.js";
import { useScanner } from "./useScanner.js";
import { useSmartMoney } from "./useSmartMoney.js";

/**
 * Global keyboard routing for the dashboard (D-05, D-08, T/W/R/S/Q).
 *
 * - While a modal is open (`active !== "none"`), this hook returns early so the
 *   modal's TextInput.useInput handles keys. Ink broadcasts input to all
 *   mounted handlers; consolidating dispatch here keeps intent clear.
 * - S → triggerScan, W/R/T → open corresponding modal, Q → useApp().exit().
 * - Tab → cycleFocus, arrows → focus+row-selection (up at row 0 crosses to
 *   the spatial neighbor; otherwise decrements selection within panel).
 * - Enter triggers research on the focused panel's selected row (D-08).
 *   Resolution by panel: scanner → scanner[row].address; convergence →
 *   convergence[row].tokenAddress; smart-money → no-op (NormalizedTrade has
 *   no tokenAddress field, see deviation in SUMMARY); research → no-op
 *   (researching the current research result is circular).
 */
export function useKeybinds(): void {
  const { exit } = useApp();
  const { active, open } = useModal();
  const { cycleFocus, moveFocus, focusedPanel, selectedRow, setSelectedRow } = useFocus();
  const actions = useActions();
  const scanner = useScanner();
  const smartMoney = useSmartMoney();
  const convergence = useConvergence();

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
      const row = selectedRow[focusedPanel];
      let tokenAddress: string | undefined;
      if (focusedPanel === "scanner" && scanner !== null) {
        tokenAddress = scanner[row]?.address;
      } else if (focusedPanel === "convergence") {
        tokenAddress = convergence[row]?.tokenAddress;
      }
      // smart-money: NormalizedTrade has no tokenAddress field — Enter is a
      // no-op here. research: drilling into the current research result would
      // be circular — Enter is also a no-op. Keep `smartMoney` referenced so
      // future refactors (e.g. tagged NormalizedTrade) can wire it without
      // re-adding a hook subscription.
      void smartMoney;
      if (tokenAddress !== undefined) {
        void actions.requestResearch(tokenAddress);
      }
    }
  });
}
