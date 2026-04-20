<div align="center">

# trenchkit

**From 500 GMGN trending tokens to 3 to 5 high-conviction plays. In your terminal. In seconds.**

Open source. MIT licensed. Built on the GMGN OpenAPI.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-22%2B-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Powered by GMGN](https://img.shields.io/badge/Powered_by-GMGN_OpenAPI-FF6B00)](https://gmgn.ai/ai)
[![CI](https://github.com/LW-ARTS/trenchkit/actions/workflows/ci.yml/badge.svg)](https://github.com/LW-ARTS/trenchkit/actions/workflows/ci.yml)

</div>

---

## Stop scrolling GMGN trending. Score it.

You already use GMGN. You already know the drill: refresh trending, click a ticker, scan holders, squint at the dev wallet, cross-check Smart Money, hope you didn't miss anything. 500 tokens. Every hour.

trenchkit runs that workflow on rails. It pulls the same GMGN feed, drops the rugs and honeypots before you ever see them, scores what survives across 6 dimensions, and hands you a shortlist. No tabs. No scrolling. No vibes.

```
  500 trending tokens
         │
         ▼   hard filters (liquidity, honeypot, dev rug ratio, top-10 holder)
  ~40 candidates
         │
         ▼   7-endpoint research burst (17 weight/token)
  full TokenAnalysis
         │
         ▼   6-dimension conviction score + smart-money cross-reference
  3 to 5 tokens with conviction > 80
```

Every token comes with a receipt: why it qualified, what dimensions scored, which Smart Money wallets bought. You can audit the signal or disagree with it. You can't do that on a trending page.

## Quick start

```bash
# 1. Clone and build (npm package coming soon)
git clone https://github.com/LW-ARTS/trenchkit.git
cd trenchkit
npm install
npm run build
npm link        # puts `trenchkit` on your PATH

# 2. Configure (grab an API key at https://gmgn.ai/ai)
trenchkit init

# 3. One-shot scan
trenchkit scan --min-score 70

# 4. Or launch the live 4-panel dashboard
trenchkit live
```

Analysis commands work with a free GMGN read-only API key. Trading is opt-in and requires a signed Ed25519 key you control.

## Why trenchkit (vs the alternatives)

|                      | trenchkit           | GMGN web UI       | Photon / BullX    |
|----------------------|---------------------|-------------------|-------------------|
| Cost                 | Free, MIT           | Free              | Paid / gated      |
| Terminal native      | Yes                 | No                | No                |
| Open source          | Yes                 | No                | No                |
| Scored shortlist     | 6-dimension 0 to 100| Manual            | Partial           |
| Auditable pipeline   | Every signal traced | Black box         | Black box         |
| Convergence alerts   | Yes (multi-SM)      | No                | Partial           |
| Works over SSH       | Yes                 | No                | No                |
| Your keys, your coin | Yes                 | N/A               | Platform custody  |

trenchkit does not replace your wallet, your RPC, or your brain. It replaces the tab where you were going to spend 20 minutes scrolling.

## What's in the box

### Scanner: trending tokens, scored

```
$ trenchkit scan --min-score 70

┌───┬─────────┬────────┬────────┬────────┬──────┐
│ # │ Token   │ MC     │ Score  │ Grade  │ Age  │
├───┼─────────┼────────┼────────┼────────┼──────┤
│ 1 │ $ABC    │ $240k  │ 87     │ A      │ 12m  │
│ 2 │ $XYZ    │ $180k  │ 74     │ B      │ 28m  │
│ 3 │ $DEF    │  $95k  │ 62     │ C      │ 45m  │
└───┴─────────┴────────┴────────┴────────┴──────┘
```

Flags: `--trenches` (launchpad tokens), `--chain base`, `--min-score 70`, `--watch`.

### Wallet Intel: full profile with 5-dimension scoring

```
$ trenchkit wallet <address>
```

Win rate. Realized and unrealized P&L. Current holdings with cost basis. Scored across win rate, profit factor, activity, diversification, token quality. Use `--holdings` or `--history` for focused views.

### Smart Money: KOL and SM wallet trade feed

```
$ trenchkit smartmoney --convergence
```

Streams Smart Money and KOL buys/sells live. `--convergence` surfaces the high-signal case: multiple SM wallets piling into the same token inside a detection window. This is the strongest read you can derive from GMGN's wallet tags.

### Research: 7-endpoint deep dive

```
$ trenchkit research <token_address>

  RESEARCH REPORT: $ABC (SOL)
  MC $240k  |  Liq $48k  |  Vol24h $112k

┌─────────────────────┬───────┬───────┬────────────────────────────────────────┐
│ Dimension           │ Grade │ Score │ Detail                                 │
├─────────────────────┼───────┼───────┼────────────────────────────────────────┤
│ Security            │ A     │  92   │ Renounced, No honeypot                 │
│ Holder Quality      │ B+    │  83   │ Top10 hold 28%, 1200 holders           │
│ Liquidity           │ B     │  76   │ $48k, stable                           │
│ Dev Trust           │ A     │  88   │ 40% graduation rate, ATH MC $2.1M      │
│ Smart Money         │ A     │  91   │ 8 SM wallets, 34% SM volume            │
│ Bot/Manipulation    │ B     │  72   │ 12% bots, Low bot activity             │
└─────────────────────┴───────┴───────┴────────────────────────────────────────┘

  CONVICTION SCORE: 87/100 HIGH
```

Add `--json` for machine-readable output. Pipe it into jq, a Telegram bot, a Discord webhook, your own alert engine.

### Live dashboard: 4 panels, keyboard driven

```
$ trenchkit live
```

4 panels (Scanner, Smart Money feed, Convergence alerts, Recent research) on a single refresh schedule tuned to stay inside the GMGN rate-limit budget. Keyboard driven: `S` scan, `W` wallet lookup, `R` research, `T` trade, `Tab` switch panels, `Q` quit. Ships well over SSH and tmux, so you can run it on a $4 VPS and monitor from your phone.

### Trade (opt-in): swap with server-side TP and SL

```
$ trenchkit trade buy <token_address> --amount 0.5 --tp 150 --sl 30
  Buy ~142,000 $ABC for 0.5 SOL (slippage: 2.0%)
  Confirm? [y/N] y
  Order o_abc123: confirmed
  Tx: https://solscan.io/tx/...
```

- Requires `GMGN_PRIVATE_KEY` (configured via `trenchkit init`). All analysis works without it.
- Every trade is previewed and confirmed. `--yes` skips the prompt, but the `maxTradeAmount` cap in `config.json` still applies.
- TP and SL are attached server-side via `condition_orders`. No local polling, no missed fills if your laptop sleeps.
- On Solana, `priorityFee` and `tipFee` are auto-injected when TP/SL is attached (otherwise the swap succeeds but strategy creation silently fails, a GMGN-side quirk).
- **POST /swap is never retried** on auth-timestamp-expired or network error. The CLI directs you to `trenchkit trade orders` to verify execution before resubmitting. Prevents double-spend on non-idempotent POSTs.

Subcommands: `buy`, `sell --percent`, `status <order_id>`, `orders`.

## Conviction score methodology

6 weighted dimensions, each scored 0 to 100, combined into a single conviction score.

| Dimension          | Weight | What it captures                                                   |
|--------------------|-------:|--------------------------------------------------------------------|
| Holder Quality     | 25%    | Top-10 concentration, holder count, fresh-wallet rate              |
| Security           | 20%    | Renounced mint/freeze, honeypot, buy/sell taxes, rug ratio         |
| Liquidity          | 15%    | Pool depth, lock status, stability                                 |
| Dev Trust          | 15%    | Graduation rate of prior tokens, ATH MC history, dev holdings      |
| Smart Money        | 15%    | SM wallet count, SM volume ratio, bluechip owner %                 |
| Bot / Manipulation | 10%    | Bot degen rate, wash trading, bundler rate                         |

**Action thresholds**

| Score      | Label      |
|------------|------------|
| 80 or more | HIGH       |
| 60 to 79   | MODERATE   |
| 40 to 59   | LOW        |
| below 40   | AVOID      |

Partial data (when some endpoints are unavailable, common on BSC and Base) caps the reported score at 80. A conviction of 81+ is only emitted when every dimension had real input.

## FAQ

### How is this different from GMGN's own web UI?

GMGN's trending page shows you 500 tokens and lets you click one at a time. trenchkit applies the same filters every trader reaches for (liquidity, honeypot, holder concentration), then scores what's left. You stop clicking. You start reading a scored shortlist.

### Do I need to pay for anything?

No. GMGN's OpenAPI has a free tier that covers everything trenchkit does for analysis. Trading (the signed-key path) costs whatever the chain's gas costs plus GMGN's swap fee. Same as the web UI.

### Is my private key safe?

The key is read from `~/.config/trenchkit/.env` (chmod 600), held in a `Buffer`, zeroed after each signing op, and never written to `process.env` for the session. No heap dumps, no child-process leaks. Source: `src/foundation/auth.ts`.

### Does this work over SSH / on a VPS?

Yes. That's the point. `trenchkit live` is a full TUI, not a local-only Electron trap. Run it on a VPS, tmux it, SSH in.

### Can I wire this into a bot?

Every command supports `--json`. Pipe it into jq, a Telegram bot, a Discord webhook, whatever. The pipeline is a building block, not a walled garden.

### I don't trust memecoin scoring. Why should I trust this one?

You shouldn't. You should read [the scorers](src/engine/scorers/) and audit the weights. Every dimension is open, every input is labeled, every cap is documented. If you disagree with the weights, fork it and change them. That's the whole point of the MIT license.

## Architecture

Four layers, dependencies flow downward only.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  Interface       CLI commands  │  TUI dashboard (Ink + React)   │
  ├─────────────────────────────────────────────────────────────────┤
  │  Engine          Filters  │  6 scorers  │  Aggregator │ Pipeline│
  ├─────────────────────────────────────────────────────────────────┤
  │  Core Modules    Scanner  │  Wallet  │  SmartMoney  │  Research │
  ├─────────────────────────────────────────────────────────────────┤
  │  Foundation      GMGN client (signed) │ Rate limiter │ Config   │
  └─────────────────────────────────────────────────────────────────┘
```

- **Foundation** wraps the GMGN OpenAPI with a typed client, a Bottleneck-backed rate limiter (priority queue, weight accounting), Ed25519 request signing, a typed event emitter, chain-aware config.
- **Core Modules** implement the four domain features. They emit events and never import each other.
- **Engine** applies hard filters, then runs six independent scorers in parallel, aggregated into one conviction score.
- **Interface** is commander.js for one-shot commands and Ink/React for the TUI. In TUI mode a single `PipelineProvider` owns orchestration, panels subscribe to slices via per-slice contexts, so clock ticks never re-render the scanner.

Deep dive: [ARCHITECTURE.md](ARCHITECTURE.md).

## Configuration

```bash
trenchkit init                       # interactive setup
trenchkit config set chain base      # change default chain
trenchkit --chain base scan          # per-command override
```

Runtime files (chmod 600, never logged):

- `~/.config/trenchkit/.env`: `GMGN_API_KEY`, optional `GMGN_PRIVATE_KEY`
- `~/.config/trenchkit/config.json`: `defaultChain`, `maxTradeAmount`, `defaultPriorityFee`, `defaultTipFee`, `walletAddress`

## Supported chains

| Chain | Native | Explorer                    |
|-------|--------|-----------------------------|
| SOL   | SOL    | https://solscan.io          |
| BSC   | BNB    | https://bscscan.com         |
| Base  | ETH    | https://basescan.org        |

Chain-aware address validation (base58 vs 0x-hex), security fields (freeze/mint authority on SOL, honeypot/taxes on EVM), and fee handling.

## Built with

**Runtime:** Node.js 22+, ESM-first · **Language:** TypeScript 6 (strict + `exactOptionalPropertyTypes`) · **CLI:** Commander 14 · **TUI:** Ink 7 + React 19 · **Rate limiting:** Bottleneck · **Signing:** `@noble/ed25519` · **Test:** Vitest (333 tests passing) · **Lint and format:** Biome · **Build:** tsup

## Contributing

Issues and PRs welcome. A few ground rules:

- Keep commits atomic and conventional (`feat(ui):`, `fix(foundation):`, etc.).
- `npm run lint && npm run typecheck && npm test` must pass before you open a PR.
- New runtime deps need a reason in the PR description.
- Scorer weight changes should ship with a benchmark against the prior version.

If you find a vulnerability, email lw.arts.designer@gmail.com instead of opening a public issue.

## Credits

Built during the GMGN Open-Source Case Collection (Season 1) by [LW Arts](https://lwdesigns.art). Powered by the GMGN OpenAPI.

## License

MIT. See [LICENSE](LICENSE).

---

<div align="center">

**Built by [@LWARTSS](https://twitter.com/LWARTSS) · [lwdesigns.art](https://lwdesigns.art) · Powered by GMGN OpenAPI**

If trenchkit saved you a tab, star the repo. That's the whole ask.

</div>
