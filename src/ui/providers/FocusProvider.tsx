import type React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type PanelId = "scanner" | "smart-money" | "convergence" | "research";

export type FocusState = {
  focusedPanel: PanelId;
  selectedRow: Record<PanelId, number>;
};

export type FocusContextValue = FocusState & {
  setFocusedPanel: (id: PanelId) => void;
  setSelectedRow: (id: PanelId, index: number) => void;
  cycleFocus: () => void;
  moveFocus: (dir: "up" | "down" | "left" | "right") => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);

const INITIAL_ROWS: Record<PanelId, number> = {
  scanner: 0,
  "smart-money": 0,
  convergence: 0,
  research: 0,
};

// Clockwise: TL (scanner) → TR (smart-money) → BR (research) → BL (convergence) → TL
const CYCLE_ORDER: readonly PanelId[] = ["scanner", "smart-money", "research", "convergence"];

const SPATIAL: Record<PanelId, Record<"up" | "down" | "left" | "right", PanelId>> = {
  scanner: { up: "scanner", down: "convergence", left: "scanner", right: "smart-money" },
  "smart-money": {
    up: "smart-money",
    down: "research",
    left: "scanner",
    right: "smart-money",
  },
  convergence: {
    up: "scanner",
    down: "convergence",
    left: "convergence",
    right: "research",
  },
  research: { up: "smart-money", down: "research", left: "convergence", right: "research" },
};

export function FocusProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [focusedPanel, setFocusedPanel] = useState<PanelId>("scanner");
  const [selectedRow, setSelectedRowState] = useState<Record<PanelId, number>>(INITIAL_ROWS);

  const setSelectedRow = useCallback((id: PanelId, index: number) => {
    setSelectedRowState((prev) => ({ ...prev, [id]: Math.max(0, index) }));
  }, []);

  const cycleFocus = useCallback(() => {
    setFocusedPanel((prev) => {
      const idx = CYCLE_ORDER.indexOf(prev);
      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length] ?? "scanner";
    });
  }, []);

  const moveFocus = useCallback((dir: "up" | "down" | "left" | "right") => {
    setFocusedPanel((prev) => SPATIAL[prev][dir]);
  }, []);

  const value = useMemo<FocusContextValue>(
    () => ({
      focusedPanel,
      selectedRow,
      setFocusedPanel,
      setSelectedRow,
      cycleFocus,
      moveFocus,
    }),
    [focusedPanel, selectedRow, setSelectedRow, cycleFocus, moveFocus],
  );

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>;
}

export function useFocus(): FocusContextValue {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used inside FocusProvider");
  return ctx;
}
