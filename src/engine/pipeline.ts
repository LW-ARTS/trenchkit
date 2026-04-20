import type { GmgnClient } from "../foundation/api/client.js";
import type { PipelineEvents } from "../foundation/events.js";
import { pipelineEvents } from "../foundation/events.js";
import type { Chain, TokenAnalysis } from "../foundation/types.js";
import { ResearchEngine } from "../modules/research.js";
import { Scanner } from "../modules/scanner.js";
import type { ConvergenceAlert, NormalizedTrade } from "../modules/smart-money.js";
import { SmartMoneyTracker } from "../modules/smart-money.js";
import { passesHardFilters } from "./filters.js";
import { calculateConviction } from "./scorers/index.js";

export class Pipeline {
  private scanner: Scanner;
  private research: ResearchEngine;
  private smartMoney: SmartMoneyTracker;
  private chain: Chain;
  private convergenceHandler: (payload: PipelineEvents["convergence:detected"]) => void;
  private disposed = false;

  constructor(client: GmgnClient, chain: Chain) {
    this.chain = chain;
    this.scanner = new Scanner(client, chain);
    this.research = new ResearchEngine(client, chain);
    this.smartMoney = new SmartMoneyTracker(client, chain);

    // Auto-trigger research on strong convergence
    // Stored as a named field so dispose() can off() the same reference.
    this.convergenceHandler = async (payload) => {
      if (payload.chain === this.chain && payload.strength >= 70) {
        const analysis = await this.research.research(payload.tokenAddress);
        const scored = calculateConviction(analysis);
        pipelineEvents.emit("research:complete", {
          tokenAddress: payload.tokenAddress,
          analysis: scored,
        });
      }
    };
    pipelineEvents.on("convergence:detected", this.convergenceHandler);
  }

  dispose(): void {
    if (this.disposed) return; // idempotent — safe to call multiple times
    this.disposed = true;
    pipelineEvents.off("convergence:detected", this.convergenceHandler);
  }

  // One-shot: scan -> filter -> score (for CLI commands)
  async scan(): Promise<TokenAnalysis[]> {
    const candidates = await this.scanner.pollTrending();
    // Trenches endpoint path is not yet migrated to the new /v1/trenches shape
    // (tracked as known tech debt). A failure here must not abort the whole
    // scan — trenches is additive data on top of trending.
    let trenchCandidates: TokenAnalysis[] = [];
    try {
      trenchCandidates = await this.scanner.pollTrenches();
    } catch {
      // swallow: trending-only scan is still useful
    }
    const all = [...candidates, ...trenchCandidates];

    return all
      .filter(passesHardFilters)
      .map(calculateConviction)
      .sort((a, b) => (b.convictionScore ?? 0) - (a.convictionScore ?? 0));
  }

  // One-shot: full research on a single token
  async researchToken(tokenAddress: string): Promise<TokenAnalysis> {
    const analysis = await this.research.research(tokenAddress);
    return calculateConviction(analysis);
  }

  // Poll smart money and return convergence alerts
  async pollSmartMoney(): Promise<ConvergenceAlert[]> {
    return this.smartMoney.poll();
  }

  getRecentSmartMoneyTrades(): NormalizedTrade[] {
    return this.smartMoney.getRecentTrades();
  }

  getScanner(): Scanner {
    return this.scanner;
  }
}
