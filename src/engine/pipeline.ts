import type { GmgnClient } from '../foundation/api/client.js'
import type { Chain, TokenAnalysis } from '../foundation/types.js'
import { pipelineEvents } from '../foundation/events.js'
import { Scanner } from '../modules/scanner.js'
import { ResearchEngine } from '../modules/research.js'
import { SmartMoneyTracker } from '../modules/smart-money.js'
import type { ConvergenceAlert } from '../modules/smart-money.js'
import { passesHardFilters } from './filters.js'
import { calculateConviction } from './scorers/index.js'

export class Pipeline {
  private scanner: Scanner
  private research: ResearchEngine
  private smartMoney: SmartMoneyTracker
  private chain: Chain

  constructor(client: GmgnClient, chain: Chain) {
    this.chain = chain
    this.scanner = new Scanner(client, chain)
    this.research = new ResearchEngine(client, chain)
    this.smartMoney = new SmartMoneyTracker(client, chain)

    // Auto-trigger research on strong convergence
    pipelineEvents.on('convergence:detected', async (payload) => {
      if (payload.chain === this.chain && payload.strength >= 70) {
        const analysis = await this.research.research(payload.tokenAddress)
        const scored = calculateConviction(analysis)
        pipelineEvents.emit('research:complete', {
          tokenAddress: payload.tokenAddress,
          analysis: scored,
        })
      }
    })
  }

  // One-shot: scan -> filter -> score (for CLI commands)
  async scan(): Promise<TokenAnalysis[]> {
    const candidates = await this.scanner.pollTrending()
    const trenchCandidates = await this.scanner.pollTrenches()
    const all = [...candidates, ...trenchCandidates]

    return all
      .filter(passesHardFilters)
      .map(calculateConviction)
      .sort((a, b) => (b.convictionScore ?? 0) - (a.convictionScore ?? 0))
  }

  // One-shot: full research on a single token
  async researchToken(tokenAddress: string): Promise<TokenAnalysis> {
    const analysis = await this.research.research(tokenAddress)
    return calculateConviction(analysis)
  }

  // Poll smart money and return convergence alerts
  async pollSmartMoney(): Promise<ConvergenceAlert[]> {
    return this.smartMoney.poll()
  }

  getScanner(): Scanner {
    return this.scanner
  }
}
