import { Text } from "ink";
import { render } from "ink-testing-library";
import type React from "react";
import { useMemo, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pipeline } from "../../../src/engine/pipeline.js";
import type { Chain, TokenAnalysis } from "../../../src/foundation/types.js";
import type { ConvergenceAlert, NormalizedTrade } from "../../../src/modules/smart-money.js";
import { useKeybinds } from "../../../src/ui/hooks/useKeybinds.js";
import { FocusProvider } from "../../../src/ui/providers/FocusProvider.js";
import { ModalProvider } from "../../../src/ui/providers/ModalProvider.js";
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
} from "../../../src/ui/providers/PipelineProvider.js";
import { flushFrame } from "../helpers.js";

function makeToken(address: string): TokenAnalysis {
  return {
    address,
    chain: "sol" as Chain,
    symbol: null,
    name: null,
    marketCap: null,
    liquidity: null,
    holderCount: null,
    volume24h: null,
    age: null,
    priceChange5m: null,
    isHoneypot: null,
    isRenounced: null,
    isFreezeAuthorityRenounced: null,
    isMintAuthorityRenounced: null,
    buyTax: null,
    sellTax: null,
    rugRatio: null,
    burnRatio: null,
    isWashTrading: null,
    isOnCurve: null,
    launchpadProgress: null,
    top10HolderRate: null,
    holderGrowthRate: null,
    freshWalletRate: null,
    insiderHoldRate: null,
    botDegenRate: null,
    bundlerRate: null,
    ratTraderRate: null,
    sniperCount: null,
    bluechipOwnerPercentage: null,
    privateVaultHoldRate: null,
    creatorOpenCount: null,
    creatorInnerCount: null,
    creatorOpenRatio: null,
    devAthMc: null,
    smartMoneyWalletCount: null,
    smartMoneyVolumeRatio: null,
    convergenceStrength: null,
    liquidityStable: null,
    lifecycleStage: null,
    dimensionScores: null,
    convictionScore: null,
    convictionLabel: null,
    partialData: false,
  };
}

type SpyActions = PipelineContextValue["actions"];

/**
 * Custom wrapper that overrides ActionsContext with spy actions so we can
 * assert requestResearch(address) was called when the probe triggers Enter.
 * The MockPipelineProvider in helpers.tsx does not expose an actions seam,
 * so we replicate its Context wiring here with injected spies.
 */
function SpyPipelineProvider({
  initialScanner,
  initialConvergence = [],
  spyActions,
  children,
}: {
  initialScanner: TokenAnalysis[] | null;
  initialConvergence?: ConvergenceAlert[];
  spyActions: SpyActions;
  children: React.ReactElement;
}): React.ReactElement {
  const actions = useMemo<SpyActions>(() => spyActions, [spyActions]);
  const pipelineRef = useRef<Pipeline | null>(null);
  const smartMoney: NormalizedTrade[] | null = null;

  return (
    <ChainContext.Provider value="sol">
      <PipelineRefContext.Provider value={pipelineRef}>
        <ScannerContext.Provider value={initialScanner}>
          <SmartMoneyContext.Provider value={smartMoney}>
            <ConvergenceContext.Provider value={initialConvergence}>
              <ResearchContext.Provider value={null}>
                <ClockContext.Provider value={new Date(0)}>
                  <ActionsContext.Provider value={actions}>
                    <RateLimitStatusContext.Provider value="ok">
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

function Probe(): React.ReactElement {
  useKeybinds();
  return <Text>probe</Text>;
}

describe("Enter key triggers research", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Enter on scanner panel calls actions.requestResearch with selected row address", async () => {
    const requestResearch = vi.fn<(addr: string) => Promise<void>>().mockResolvedValue(undefined);
    const spyActions: SpyActions = {
      triggerScan: vi.fn(async () => {}),
      requestResearch,
      submitTrade: vi.fn(async () => {
        throw new Error("not needed in this test");
      }),
    };
    const tokens = [makeToken("ABC123"), makeToken("DEF456")];

    const { stdin } = render(
      <SpyPipelineProvider initialScanner={tokens} spyActions={spyActions}>
        <FocusProvider>
          <ModalProvider>
            <Probe />
          </ModalProvider>
        </FocusProvider>
      </SpyPipelineProvider>,
    );

    // Initial focus is "scanner", selectedRow.scanner = 0 → ABC123.
    stdin.write("\r"); // Enter (key.return)
    await flushFrame();
    expect(requestResearch).toHaveBeenCalledWith("ABC123");
  });
});
