// Providers

// Components
export type { AppProps } from "./components/App.js";
// App shell (Phase 3 plan 02)
export { App } from "./components/App.js";
export type { ErrorBoxProps } from "./components/ErrorBox.js";
export { ErrorBox } from "./components/ErrorBox.js";
export { ATTRIBUTION, Footer } from "./components/Footer.js";
export { Header } from "./components/Header.js";
export { HeaderClock } from "./components/HeaderClock.js";
export { ModalBackdrop } from "./components/ModalBackdrop.js";
export type { PanelErrorBoundaryProps } from "./components/PanelErrorBoundary.js";
export { PanelErrorBoundary } from "./components/PanelErrorBoundary.js";
export { PanelGrid } from "./components/PanelGrid.js";
export type { TextInputProps } from "./components/TextInput.js";
export { TextInput } from "./components/TextInput.js";
export {
  MIN_TERMINAL_COLS,
  MIN_TERMINAL_ROWS,
  TooSmallFallback,
} from "./components/TooSmallFallback.js";
export type { Actions } from "./hooks/useActions.js";
// Hooks (8 per-slice selectors + actions)
export { useActions } from "./hooks/useActions.js";
export { useChain } from "./hooks/useChain.js";
export { useClock } from "./hooks/useClock.js";
export { useConvergence } from "./hooks/useConvergence.js";
export { useKeybinds } from "./hooks/useKeybinds.js";
export { useRateLimitStatus } from "./hooks/useRateLimitStatus.js";
export { useResearch } from "./hooks/useResearch.js";
export { useRowCount } from "./hooks/useRowCount.js";
export { useScanner } from "./hooks/useScanner.js";
export { useSmartMoney } from "./hooks/useSmartMoney.js";
export { useTerminalSize } from "./hooks/useTerminalSize.js";
// Modals (Phase 3 plan 02)
export { ResearchModal } from "./modals/ResearchModal.js";
export { TradeModal } from "./modals/TradeModal.js";
export { WalletModal } from "./modals/WalletModal.js";
// Panels (Phase 3)
export { ConvergencePanel } from "./panels/ConvergencePanel.js";
export { ResearchPanel } from "./panels/ResearchPanel.js";
export { ScannerPanel } from "./panels/ScannerPanel.js";
export { SmartMoneyPanel } from "./panels/SmartMoneyPanel.js";
// Focus + terminal hooks (Phase 3)
export type { FocusContextValue, PanelId } from "./providers/FocusProvider.js";
export { FocusProvider, useFocus } from "./providers/FocusProvider.js";
export type { ModalContextValue, ModalId } from "./providers/ModalProvider.js";
export { ModalProvider, useModal } from "./providers/ModalProvider.js";
export type {
  PipelineContextValue,
  PipelineProviderProps,
} from "./providers/PipelineProvider.js";
export {
  PipelineContext,
  PipelineProvider,
} from "./providers/PipelineProvider.js";
// Phase 1 legacy — keep SmokeApp exported for compat-gate regression
export { SmokeApp } from "./smoke.js";
