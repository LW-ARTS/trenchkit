// Providers

// Components
export type { ErrorBoxProps } from "./components/ErrorBox.js";
export { ErrorBox } from "./components/ErrorBox.js";
export { ATTRIBUTION, Footer } from "./components/Footer.js";
export { Header } from "./components/Header.js";
export { HeaderClock } from "./components/HeaderClock.js";
export type { PanelErrorBoundaryProps } from "./components/PanelErrorBoundary.js";
export { PanelErrorBoundary } from "./components/PanelErrorBoundary.js";
export type { Actions } from "./hooks/useActions.js";
// Hooks (8 per-slice selectors + actions)
export { useActions } from "./hooks/useActions.js";
export { useChain } from "./hooks/useChain.js";
export { useClock } from "./hooks/useClock.js";
export { useConvergence } from "./hooks/useConvergence.js";
export { useRateLimitStatus } from "./hooks/useRateLimitStatus.js";
export { useResearch } from "./hooks/useResearch.js";
export { useScanner } from "./hooks/useScanner.js";
export { useSmartMoney } from "./hooks/useSmartMoney.js";
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
