<div align="center">

# trenchkit

**Real-time crypto intelligence pipeline + TUI dashboard built on GMGN OpenAPI.**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-22%2B-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Powered by GMGN](https://img.shields.io/badge/Powered_by-GMGN_OpenAPI-FF6B00)](https://gmgn.ai/ai)

</div>

---

## The pipeline

```
  500 trending tokens
         ↓   hard filters (liquidity, honeypot, dev rug ratio, top-10 holder)
  ~40 candidates
         ↓   7-endpoint research burst (17 weight/token)
  full TokenAnalysis
         ↓   6-dimension conviction score + smart-money cross-reference
  3–5 tokens with conviction > 80
```

Instead of staring at a trending page, trenchkit turns GMGN's OpenAPI into a scored,
filtered, auditable pipeline. Every token is annotated with where it came from, why
it qualified, and who's buying.

## Quick start

```bash
# 1. Install
npm install -g trenchkit

# 2. Configure (API key + default chain, optional trading key)
trenchkit init

# 3. Run a one-shot scan
trenchkit scan --min-score 70

# 4. Launch the live dashboard
trenchkit live
```

Get a GMGN OpenAPI key at https://gmgn.ai/ai.

## Features

### Scanner — trending tokens with conviction scores

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

### Wallet Intel — full profile with 5-dimension scoring

```
$ trenchkit wallet <address>
```

Shows win rate, realized/unrealized P&L, current holdings with cost basis, and a
scored breakdown across win-rate, profit-factor, activity, diversification, and
token-quality. Use `--holdings` or `--history` for focused views.

### Smart Money — KOL + SM wallet trade feed

```
$ trenchkit smartmoney --convergence
```

Streams recent Smart Money + KOL buys/sells. `--convergence` surfaces only cases
where multiple SM wallets buy the same token inside a detection window — the highest
signal you can derive from GMGN's wallet tags.

### Research — 7-endpoint deep dive

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
│ Dev Trust           │ A-    │  88   │ 40% graduation rate, ATH MC $2.1M      │
│ Smart Money         │ A     │  91   │ 8 SM wallets, 34% SM volume            │
│ Bot/Manipulation    │ B-    │  72   │ 12% bots, Low bot activity             │
└─────────────────────┴───────┴───────┴────────────────────────────────────────┘

  CONVICTION SCORE: 87/100 HIGH
```

Use `--json` for machine-readable output.

### Trade (opt-in) — swap with server-side TP/SL

```
$ trenchkit trade buy <token_address> --amount 0.5 --tp 150 --sl 30
  Buy ~142,000 $ABC for 0.5 SOL (slippage: 2.0%)
  Confirm? [y/N] y
  Order o_abc123: confirmed
  Tx: https://solscan.io/tx/...
```

- Requires `GMGN_PRIVATE_KEY` (configured via `trenchkit init`). Analysis commands
  work without it.
- Every trade is previewed and confirmed. `--yes` bypasses the prompt but the
  `maxTradeAmount` cap in `config.json` is still enforced.
- TP/SL are attached server-side via `condition_orders` — no local polling required.
- On Solana, `priorityFee` + `tipFee` are auto-injected when TP/SL is attached
  (otherwise the swap succeeds but strategy creation silently fails).
- **POST /swap is never retried** on auth-timestamp-expired or network error. The
  CLI directs you to `trenchkit trade orders` to verify execution before resubmit.
  This prevents double-spend on non-idempotent POSTs.

Subcommands: `buy`, `sell --percent`, `status <order_id>`, `orders`.

### Live dashboard (stretch — coming in next phase)

`trenchkit live` renders a 4-panel Ink TUI: Scanner / Smart Money feed / Convergence
alerts / Recent research. Keyboard-navigable, single `usePipeline` source of truth,
refresh rates tuned to stay inside the GMGN rate-limit budget.

## Conviction score methodology

6 weighted dimensions, each scored 0–100, combined into a single conviction score.

| Dimension          | Weight | What it captures                                                   |
|--------------------|-------:|--------------------------------------------------------------------|
| Holder Quality     | 25%    | Top-10 concentration, holder count, fresh-wallet rate              |
| Security           | 20%    | Renounced mint/freeze, honeypot, buy/sell taxes, rug ratio         |
| Liquidity          | 15%    | Pool depth, lock status, stability                                 |
| Dev Trust          | 15%    | Graduation rate of prior tokens, ATH MC history, dev holdings      |
| Smart Money        | 15%    | SM wallet count, SM volume ratio, bluechip owner %                 |
| Bot / Manipulation | 10%    | Bot degen rate, wash trading, bundler rate                         |

**Action thresholds**

| Score   | Label      |
|---------|------------|
| ≥ 80    | HIGH       |
| 60–79   | MODERATE   |
| 40–59   | LOW        |
| < 40    | AVOID      |

Partial data (when some endpoints are unavailable, common on BSC/Base) caps the
reported score at 80 — a conviction of 81+ is only emitted when every dimension
had input.

## Architecture

Four layers, one-way dependencies (top → bottom):

```
  ┌──────────────────────────────────────────────────────────────┐
  │  Interface       CLI commands  |  TUI dashboard (Ink + React)│
  ├──────────────────────────────────────────────────────────────┤
  │  Engine          Filters  |  6 scorers  |  Aggregator  |  Pipeline │
  ├──────────────────────────────────────────────────────────────┤
  │  Core Modules    Scanner  |  Wallet Intel  |  SmartMoney  |  Research │
  ├──────────────────────────────────────────────────────────────┤
  │  Foundation      GMGN API client (signed)  |  Rate limiter      │
  │                  Chain config  |  Events  |  Auth  |  Config    │
  └──────────────────────────────────────────────────────────────┘
```

- **Foundation** wraps the GMGN OpenAPI with a typed client, a Bottleneck-backed
  rate limiter (priority queue + weight accounting), Ed25519 request signing, a
  typed event emitter, and chain-aware config.
- **Core Modules** implement the four domain features. They emit events and never
  import each other.
- **Engine** applies hard filters then runs six independent dimension scorers in
  parallel, aggregated into one conviction score.
- **Interface** is commander.js for one-shot commands and Ink/React for the TUI.
  In TUI mode a single `usePipeline` hook owns orchestration and panels subscribe
  to slices — pipeline and hooks can't diverge.

## Configuration

```bash
trenchkit init                       # interactive setup
trenchkit config set chain base      # default chain
trenchkit --chain base scan          # per-command override
```

Runtime files (chmod 600, never logged):

- `~/.config/trenchkit/.env` — `GMGN_API_KEY`, optional `GMGN_PRIVATE_KEY`
- `~/.config/trenchkit/config.json` — `defaultChain`, `maxTradeAmount`,
  `defaultPriorityFee`, `defaultTipFee`, `walletAddress`

The private key is read into a `Buffer`, zeroed after each signing operation,
and never written to `process.env` for the full session — keeping it out of
heap dumps and inherited child-process environments.

## Supported chains

| Chain | Native | Explorer                    |
|-------|--------|-----------------------------|
| SOL   | SOL    | https://solscan.io          |
| BSC   | BNB    | https://bscscan.com         |
| Base  | ETH    | https://basescan.org        |

Chain-aware address validation (base58 vs 0x-hex), security fields (freeze/mint
authority for SOL; honeypot/taxes for EVM), and fee handling.

## Built with

- **Runtime:** Node.js 22+, ESM-first
- **Language:** TypeScript 6 (strict + `exactOptionalPropertyTypes`)
- **CLI:** Commander 14
- **TUI:** Ink 7 + React 19
- **Rate limiting:** Bottleneck
- **Signing:** `@noble/ed25519`
- **Retries:** `p-retry`
- **Test:** Vitest
- **Lint/format:** Biome
- **Build:** tsup

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
built by <a href="https://twitter.com/LWARTSS">@LWARTSS</a> · <a href="https://lwdesigns.art">lwdesigns.art</a> · powered by GMGN OpenAPI
</div>
