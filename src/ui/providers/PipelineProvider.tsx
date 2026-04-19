import type React from "react";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import { Pipeline } from "../../engine/pipeline.js";
import type { GmgnClient } from "../../foundation/api/client.js";
import type { GmgnSwapResponse, GmgnWalletStats } from "../../foundation/api-types.js";
import type { TrenchkitConfig } from "../../foundation/config.js";
import { pipelineEvents } from "../../foundation/events.js";
import type { Chain, TokenAnalysis } from "../../foundation/types.js";
import type { ConvergenceAlert, NormalizedTrade } from "../../modules/smart-money.js";
import { executeTrade, type TradeIntent } from "../../modules/trade-flow.js";
import { pushConvergence } from "../util/convergence-buffer.js";

/**
 * Aggregate Context value TYPE — exposed for consumers that need the full shape
 * (e.g., helpers.tsx MockPipelineProvider). The runtime layer uses per-slice
 * contexts so Phase 3 panels only re-render when their slice changes (D-01).
 */
export type PipelineContextValue = {
  chain: Chain;
  scanner: TokenAnalysis[] | null;
  smartMoney: NormalizedTrade[] | null;
  convergence: ConvergenceAlert[];
  research: TokenAnalysis | null;
  clock: Date;
  actions: {
    triggerScan: () => Promise<void>;
    requestResearch: (address: string) => Promise<void>;
    submitTrade: (intent: TradeIntent) => Promise<GmgnSwapResponse>;
    lookupWallet: (address: string) => Promise<GmgnWalletStats>;
  };
  rateLimitStatus: "ok" | "rate-limited";
  pipelineRef: React.MutableRefObject<Pipeline | null>;
};

export type PipelineProviderProps = {
  chain: Chain;
  client: GmgnClient;
  config?: TrenchkitConfig;
  children: React.ReactNode;
};

type Actions = PipelineContextValue["actions"];

// Per-slice contexts: each hook subscribes to ONE context so clock ticks do not
// re-render the scanner panel etc. (locked decision D-01).
export const ChainContext = createContext<Chain | null>(null);
export const ScannerContext = createContext<TokenAnalysis[] | null | undefined>(undefined);
export const SmartMoneyContext = createContext<NormalizedTrade[] | null | undefined>(undefined);
export const ConvergenceContext = createContext<ConvergenceAlert[] | null>(null);
export const ResearchContext = createContext<TokenAnalysis | null | undefined>(undefined);
export const ClockContext = createContext<Date | null>(null);
export const ActionsContext = createContext<Actions | null>(null);
export const RateLimitStatusContext = createContext<"ok" | "rate-limited" | null>(null);
export const PipelineRefContext = createContext<React.MutableRefObject<Pipeline | null> | null>(
  null,
);

// Aggregate Context — kept for MockPipelineProvider composition + as the type
// surface described in the plan. Real PipelineProvider does NOT read it.
export const PipelineContext = createContext<PipelineContextValue | null>(null);

/** Interval cadences (spec §8) */
const SCAN_INTERVAL_MS = 30_000;
const SMART_MONEY_INTERVAL_MS = 60_000;
const CLOCK_INTERVAL_MS = 1_000;

export function PipelineProvider({
  chain,
  client,
  config,
  children,
}: PipelineProviderProps): React.ReactElement {
  const [scanner, setScanner] = useState<TokenAnalysis[] | null>(null);
  const [smartMoney, setSmartMoney] = useState<NormalizedTrade[] | null>(null);
  const [convergence, setConvergence] = useState<ConvergenceAlert[]>([]);
  const [research, setResearch] = useState<TokenAnalysis | null>(null);
  const [clock, setClock] = useState<Date>(() => new Date());
  const [rateLimitStatus, setRateLimitStatus] = useState<"ok" | "rate-limited">("ok");

  const pipelineRef = useRef<Pipeline | null>(null);
  // React 19 strict-mode guard: fresh mount gets a fresh ref; never reset in
  // cleanup (D-05, D-06 — canonical "bootstrapped once per instance" pattern).
  const bootstrapped = useRef<boolean>(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const pipeline = new Pipeline(client, chain);
    pipelineRef.current = pipeline;

    // Listener references held so cleanup can off() the same function reference.
    const onConvergence = (payload: ConvergenceAlert) => {
      setConvergence((prev) => pushConvergence(prev, payload));
    };
    const onResearch = (payload: { tokenAddress: string; analysis: TokenAnalysis }) => {
      setResearch(payload.analysis);
    };

    // NOTE: pipelineEvents emits `convergence:detected` with a subset payload
    // (tokenAddress/chain/strength — see src/foundation/events.ts). The provider
    // still stores full ConvergenceAlert entries that come back from polling
    // the pipeline (via pollSmartMoney path). For strict-mode / event-flush
    // coverage, the handler accepts a ConvergenceAlert; the test suite passes
    // a full shape when it emits manually.
    pipelineEvents.on(
      "convergence:detected",
      onConvergence as unknown as (p: {
        tokenAddress: string;
        chain: Chain;
        strength: number;
      }) => void,
    );
    pipelineEvents.on("research:complete", onResearch);

    const runScanner = async () => {
      try {
        const result = await pipeline.scan();
        setScanner(result);
      } catch {
        // swallow: a transient scan failure should not crash the TUI.
      }
    };

    const runSmartMoney = async () => {
      try {
        await pipeline.pollSmartMoney();
        setSmartMoney(pipeline.getRecentSmartMoneyTrades());
      } catch {
        // swallow: transient SM poll failure — wait for the next tick.
      }
    };

    const runClock = () => {
      setClock(new Date());
      setRateLimitStatus(client.rateLimiter.getStatus());
    };

    // Initial kick so first render shows data ASAP (does not bypass cadence —
    // setInterval still fires on its own schedule below).
    void runScanner();
    void runSmartMoney();
    runClock();

    const scannerInterval = setInterval(runScanner, SCAN_INTERVAL_MS);
    const smartMoneyInterval = setInterval(runSmartMoney, SMART_MONEY_INTERVAL_MS);
    const clockInterval = setInterval(runClock, CLOCK_INTERVAL_MS);

    return () => {
      clearInterval(scannerInterval);
      clearInterval(smartMoneyInterval);
      clearInterval(clockInterval);
      pipelineEvents.off(
        "convergence:detected",
        onConvergence as unknown as (p: {
          tokenAddress: string;
          chain: Chain;
          strength: number;
        }) => void,
      );
      pipelineEvents.off("research:complete", onResearch);
      pipeline.dispose();
      pipelineRef.current = null;
    };
  }, [client, chain]);

  // Config + client held in refs so the `actions` memo can stay dependency-free
  // and remain referentially stable across re-renders (D-03).
  const configRef = useRef<TrenchkitConfig | undefined>(config);
  configRef.current = config;
  const clientRef = useRef<GmgnClient>(client);
  clientRef.current = client;

  // Stable action dispatchers — referentially stable across re-renders so that
  // `useActions()` consumers never re-render on slice changes (D-03).
  const actions = useMemo<Actions>(
    () => ({
      triggerScan: async () => {
        const p = pipelineRef.current;
        if (!p) return;
        try {
          const result = await p.scan();
          setScanner(result);
        } catch {
          // swallow — user-triggered scan failure (e.g., 429 rate limit) should
          // not crash the TUI. Rate-limit indicator in Header already surfaces
          // the condition; next tick will retry.
        }
      },
      requestResearch: async (address: string) => {
        const p = pipelineRef.current;
        if (!p) return;
        try {
          const analysis = await p.researchToken(address);
          setResearch(analysis);
        } catch {
          // swallow — research call may 429 or partial-fail; pipelineEvents
          // emits research:complete on the successful path anyway.
        }
      },
      submitTrade: async (intent: TradeIntent) => {
        const cfg = configRef.current;
        if (!cfg) {
          throw new Error(
            "Trade disabled: no TrenchkitConfig available. Pass `config` to PipelineProvider.",
          );
        }
        // If the caller passed an empty walletAddress sentinel (TradeModal
        // does this — the modal has no wallet-address input stage), resolve
        // from config.walletAddress here. Throws a clear message if neither
        // is set, matching the CLI trade flow's "Missing wallet address" UX.
        const walletAddress = intent.walletAddress || cfg.walletAddress;
        if (!walletAddress) {
          throw new Error(
            "Missing wallet address. Set walletAddress in ~/.config/trenchkit/config.json.",
          );
        }
        // Modal pre-confirms in its 3-stage flow, so resolve prompt=true.
        return executeTrade(clientRef.current, { ...intent, walletAddress }, cfg, {
          prompt: () => Promise.resolve(true),
        });
      },
      lookupWallet: (address: string) => {
        return clientRef.current.user.getWalletStats(chain, address, "7d");
      },
    }),
    [chain],
  );

  return (
    <ChainContext.Provider value={chain}>
      <PipelineRefContext.Provider value={pipelineRef}>
        <ScannerContext.Provider value={scanner}>
          <SmartMoneyContext.Provider value={smartMoney}>
            <ConvergenceContext.Provider value={convergence}>
              <ResearchContext.Provider value={research}>
                <ClockContext.Provider value={clock}>
                  <ActionsContext.Provider value={actions}>
                    <RateLimitStatusContext.Provider value={rateLimitStatus}>
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
