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

// Each research burst costs ~17 rate-limit weight, so scan researches only the
// top candidates and reuses results across the 30s watch/dashboard ticks.
const SCAN_RESEARCH_LIMIT = 10;
const RESEARCH_TTL_MS = 5 * 60_000;

// Research wins where it has data; the trending snapshot fills the gaps
// (e.g. lifecycleStage, which only the scanner's history can compute).
function fillMissing(primary: TokenAnalysis, fallback: TokenAnalysis): TokenAnalysis {
  const merged = { ...primary };
  for (const key of Object.keys(fallback) as (keyof TokenAnalysis)[]) {
    if (merged[key] === null && fallback[key] !== null) {
      (merged as Record<keyof TokenAnalysis, unknown>)[key] = fallback[key];
    }
  }
  return merged;
}

export class Pipeline {
  private scanner: Scanner;
  private research: ResearchEngine;
  private smartMoney: SmartMoneyTracker;
  private chain: Chain;
  private convergenceHandler: (payload: PipelineEvents["convergence:detected"]) => void;
  private researchCache = new Map<string, { at: number; analysis: TokenAnalysis }>();
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

  // One-shot: scan -> filter -> research top candidates -> filter -> score
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

    const unique = new Map<string, TokenAnalysis>();
    for (const token of [...candidates, ...trenchCandidates]) {
      if (!unique.has(token.address)) unique.set(token.address, token);
    }
    const shortlist = [...unique.values()].filter(passesHardFilters).slice(0, SCAN_RESEARCH_LIMIT);

    // The trending snapshot lacks security, holder, dev, smart money and bot
    // data, so scoring it directly would score blanks. Research each candidate
    // sequentially: parallel bursts would overflow the rate limiter's queue.
    this.pruneResearchCache();
    const researched: TokenAnalysis[] = [];
    for (const candidate of shortlist) {
      const analysis = await this.researchCached(candidate.address);
      researched.push(fillMissing(analysis, candidate));
    }

    return researched
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

  private async researchCached(tokenAddress: string): Promise<TokenAnalysis> {
    const cached = this.researchCache.get(tokenAddress);
    if (cached && Date.now() - cached.at < RESEARCH_TTL_MS) return cached.analysis;
    const analysis = await this.research.research(tokenAddress);
    this.researchCache.set(tokenAddress, { at: Date.now(), analysis });
    return analysis;
  }

  private pruneResearchCache(): void {
    const now = Date.now();
    for (const [address, entry] of this.researchCache) {
      if (now - entry.at >= RESEARCH_TTL_MS) this.researchCache.delete(address);
    }
  }
}
