import { render } from "ink-testing-library";
import type React from "react";
import { useMemo, useRef } from "react";
import { vi } from "vitest";
import type { Pipeline } from "../../src/engine/pipeline.js";
import type { Chain, TokenAnalysis } from "../../src/foundation/types.js";
import type { ConvergenceAlert, NormalizedTrade } from "../../src/modules/smart-money.js";
import {
  ActionsContext,
  ChainContext,
  ClockContext,
  ConvergenceContext,
  type PipelineContextValue,
  PipelineRefContext,
  RateLimitStatusContext,
  ResearchContext,
  ScannerContext,
  SmartMoneyContext,
} from "../../src/ui/providers/PipelineProvider.js";

/**
 * Flush pending React state updates + Ink frame commits.
 *
 * React 19 + Ink 7 do NOT commit setState synchronously — tests that write to
 * stdin or emit events must await a microtask before reading lastFrame().
 * Hoisted from Phase 1 smoke.test.tsx inline pattern (D-22).
 */
export async function flushFrame(ticks = 1): Promise<void> {
  for (let i = 0; i < ticks; i++) {
    await new Promise<void>((r) => {
      setImmediate(r);
    });
  }
}

/**
 * Enable fake timers and return a cleanup fn. Convenient boilerplate for
 * beforeEach / afterEach — use inside tests that drive setInterval cadences
 * (D-24 locked default: vi.useFakeTimers in hook + provider tests).
 */
export function setupFakeTimers(): { cleanup: () => void } {
  // IMPORTANT: exclude setImmediate from the fake-timer faking list so
  // flushFrame() keeps working. Vitest's default fake-timers list includes
  // setImmediate; faking it causes flushFrame to hang forever waiting on a
  // microtask that never fires.
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
  });
  return {
    cleanup: () => {
      vi.useRealTimers();
    },
  };
}

export type RenderWithPipelineOptions = {
  chain?: Chain;
  initialScanner?: TokenAnalysis[] | null;
  initialSmartMoney?: NormalizedTrade[] | null;
  initialConvergence?: ConvergenceAlert[];
  initialResearch?: TokenAnalysis | null;
  initialClock?: Date;
  initialRateLimitStatus?: "ok" | "rate-limited";
  children: React.ReactElement;
};

/**
 * Render `children` inside a MockPipelineProvider that exposes the same 9 per-slice
 * contexts as the real PipelineProvider — but without starting intervals or
 * subscribing to pipelineEvents. Panels + hook tests stay ≤5 lines of setup (D-23).
 */
export function renderWithPipeline(options: RenderWithPipelineOptions): ReturnType<typeof render> {
  return render(<MockPipelineProvider {...options}>{options.children}</MockPipelineProvider>);
}

type MockPipelineProviderProps = RenderWithPipelineOptions;

/**
 * Internal — NOT exported. The contract is "provide the same Context identity as
 * the real provider" so useScanner/useClock/etc resolve uniformly. No intervals,
 * no pipelineEvents subscription, no Pipeline instance.
 */
function MockPipelineProvider(props: MockPipelineProviderProps): React.ReactElement {
  const {
    chain = "sol",
    initialScanner = null,
    initialSmartMoney = null,
    initialConvergence = [],
    initialResearch = null,
    initialClock,
    initialRateLimitStatus = "ok",
    children,
  } = props;

  // Stable no-op actions so `useActions()` resolves without throwing.
  const actions = useMemo<PipelineContextValue["actions"]>(
    () => ({
      triggerScan: async () => {},
      requestResearch: async () => {},
    }),
    [],
  );

  const clock = initialClock ?? new Date(0);
  const pipelineRef = useRef<Pipeline | null>(null);

  return (
    <ChainContext.Provider value={chain}>
      <PipelineRefContext.Provider value={pipelineRef}>
        <ScannerContext.Provider value={initialScanner}>
          <SmartMoneyContext.Provider value={initialSmartMoney}>
            <ConvergenceContext.Provider value={initialConvergence}>
              <ResearchContext.Provider value={initialResearch}>
                <ClockContext.Provider value={clock}>
                  <ActionsContext.Provider value={actions}>
                    <RateLimitStatusContext.Provider value={initialRateLimitStatus}>
                      {children}
                    </RateLimitStatusContext.Provider>
                  </ActionsContext.Provider>
                </ClockContext.Provider>
              </ResearchContext.Provider>
            </ConvergenceContext.Provider>
          </SmartMoneyContext.Provider>
        </ScannerContext.Provider>
      </PipelineRefContext.Provider>
    </ChainContext.Provider>
  );
}
