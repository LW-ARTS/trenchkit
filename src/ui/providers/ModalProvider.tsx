import type React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ModalId = "none" | "wallet" | "research" | "trade";

export type ModalContextValue = {
  active: ModalId;
  open: (id: Exclude<ModalId, "none">) => void;
  close: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [active, setActive] = useState<ModalId>("none");
  const open = useCallback((id: Exclude<ModalId, "none">) => setActive(id), []);
  const close = useCallback(() => setActive("none"), []);
  const value = useMemo<ModalContextValue>(() => ({ active, open, close }), [active, open, close]);
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside ModalProvider");
  return ctx;
}
