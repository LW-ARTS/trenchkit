# trenchkit architecture

Technical reference for contributors. For product overview and usage, see [README](README.md).

## Philosophy

One-way dependencies. Explicit boundaries. Domain logic never imports from the interface layer, interface never reaches into foundation. Each layer can be replaced without touching the others.

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

## Layers

### Foundation (`src/foundation/`)

GMGN OpenAPI binding, rate limiting, auth signing, config persistence, typed event bus. No domain logic.

- `api/client.ts` owns the typed `request<T>()` function. Every HTTP call flows through it, through Bottleneck, with optional Ed25519 signing.
- `api/token.ts`, `market.ts`, `user.ts`, `trade.ts` split the GMGN surface by domain. Each exports a `createXApi(ctx)` factory returning an object of closures.
- `auth.ts` parses the PEM private key once, zeroes the intermediate buffer, caches raw 32 bytes in a `Uint8Array`, exposes `clearKeyMaterial()`. The key never lands in `process.env`.
- `rate-limiter.ts` wraps Bottleneck. Weighted reservoir (10 per second), priority queue, 429 penalty mode that reads `X-RateLimit-Reset`.
- `events.ts` exports `pipelineEvents`, a `TypedEventEmitter<PipelineEvents>` with compile-time payload enforcement.
- `config.ts` reads/writes `~/.config/trenchkit/.env` and `~/.config/trenchkit/config.json`, both chmod 600.
- `chain.ts` holds the per-chain invariants table (`CHAINS.sol`, `CHAINS.bsc`, `CHAINS.base`): native symbol, wrapped address, decimals, explorer, applicable security fields.

### Core Modules (`src/modules/`)

Domain logic. One class per domain. Modules emit events, never import each other.

- `scanner.ts` + `scanner-lifecycle.ts` walk the trending feed, apply hard filters, maintain a 20-point history per observed token for lifecycle classification.
- `research.ts` runs the 7-endpoint research burst and maps GMGN `snake_case` payloads to domain `camelCase` via `mapTokenInfo`, `mapSecurity`, `mapHolders`, `mapDevHistory`, `mapKlineStability`.
- `smart-money.ts` tracks KOL and Smart Money wallet trades, publishes `convergence:detected` when N wallets pile into the same token inside a detection window.
- `wallet-intel.ts` profiles a wallet across 5 dimensions (win rate, profit factor, activity, diversification, token quality).
- `trade-flow.ts` is the stateless orchestration for `executeTrade()`. Owns the preview-prompt-swap-condition sequence and the `MaxTradeAmountExceeded` guard.

Cross-module coordination happens exclusively through `pipelineEvents`.

### Engine (`src/engine/`)

The scan-to-shortlist pipeline.

- `filters.ts` applies hard filter predicates (liquidity floor, honeypot, dev rug ratio, top-10 holder concentration) and fails a candidate fast.
- `scorers/` holds six independent dimension scorers: security, holder-quality, liquidity, dev-trust, smart-money, bot-manipulation.
- `scorers/index.ts` is the aggregator. Runs the six scorers in parallel, combines weighted scores, caps at 80 when any scorer saw partial data.
- `pipeline.ts` wires Scanner, filters, Research, scorers into a single flow. Read-only commands (wallet, trade) skip the engine and instantiate modules directly.

### Interface (`src/commands/`, `src/ui/`)

CLI and TUI.

- `src/commands/*.ts`: one file per top-level command. Each exports `registerXCommand(program: Command)` that attaches subcommands to the Commander instance. Output uses `chalk` and `cli-table3`.
- `src/commands/live.tsx`: mounts the Ink root, performs pre-Ink validation (chain, TTY, API key), shows the ASCII boot banner, hands off to `App.tsx`.
- `src/ui/providers/PipelineProvider.tsx`: the single orchestration owner. Holds the Pipeline instance, runs intervals (scanner 30s, smart money 60s, clock 1s), publishes state to 10 per-slice React contexts.
- `src/ui/components/*`: panels subscribe to the narrowest context they need. A clock tick never re-renders the scanner panel.
- `src/ui/modals/*`: 4-stage modal pattern (input, loading, result, error) with mount-guard refs to prevent setState after unmount.

## Runtime

- **Node.js >= 22**, ESM only. `package.json` has `"type": "module"`, all imports use the `.js` suffix (NodeNext resolution).
- **TypeScript 6** strict + `exactOptionalPropertyTypes`. Options objects assemble fields conditionally so `undefined` is never explicit.
- **Ink 7 + React 19** for the TUI. React 19 strict-mode double-mount is guarded in `PipelineProvider` with a `bootstrapped` ref.
- **Commander 14** for the CLI surface. Global `--chain` option, per-command subcommands.
- **Bottleneck** as the rate limiter. Weight accounting keeps sustained traffic below GMGN's 0.17 weight/s budget; research bursts are capped at 17 weight.
- **tsup** emits a single ESM bundle to `dist/index.js` with a `#!/usr/bin/env node` shebang.
- **Vitest 4** runs 333 tests across 49 files. `ink-testing-library` drives the UI suite.
- **Biome 2.4** handles both lint and format.

## Naming and conventions

- Files: `kebab-case.ts`, tests mirror source structure in `tests/`.
- Functions, variables: `camelCase`.
- Types, classes: `PascalCase` (`TokenAnalysis`, `GmgnClient`, `WalletProfile`).
- Error classes end in `Error` (`AuthTimestampExpiredError`, `MaxTradeAmountExceeded`).
- Module constants and rate-limit configs: `UPPER_SNAKE_CASE`.
- Enum-like objects use `as const` with PascalCase name, never the `enum` keyword.
- Chain identifiers stay lowercase (`"sol" | "bsc" | "base"`) because GMGN uses them as URL path segments.
- Raw GMGN wire shapes keep `snake_case` (signing operates on literal request bytes). The `snake_case → camelCase` translation lives at the module boundary (`src/modules/research.ts`).

## Error handling

- Typed errors for control flow: `AuthTimestampExpiredError` drives the GET-retry-once, POST-never-retry decision in `src/foundation/api/client.ts`.
- `MaxTradeAmountExceeded` is caught by the CLI to print a config hint.
- Every error message that could leak the API key passes through `sanitizeApiKey()` before being thrown.
- Research endpoints swallow per-endpoint failures into `analysis.partialData = true` rather than aborting the whole report.
- Rate-limit 429 responses read `X-RateLimit-Reset` and call `rateLimiter.applyPenalty(ms)` to stall the reservoir until reset.

## Security posture

- Private key read once from `~/.config/trenchkit/.env`, PEM buffer zeroed after key extraction, cached as `Uint8Array`, wiped on teardown.
- Key never persisted to `process.env` or child processes.
- API keys redacted from every error message at the boundary.
- `POST /swap` never retries on auth-timestamp-expired or network error. CLI directs the user to `trenchkit trade orders` to verify execution before resubmitting, preventing double-spend.
- `maxTradeAmount` enforced in `trade-flow.ts` before any swap call, even when `--yes` skips the prompt.

## Testing

49 test files, 333 tests. Tests mirror the source layout: `src/foundation/api/client.ts` is covered by `tests/foundation/api-client.test.ts` (directory flattened into filename).

- **Contract tests** pin the GMGN request/response shapes so wire changes fail at CI, not in production.
- **UI tests** use `ink-testing-library` with a `waitForFrame` helper to bridge React microtasks and Ink's render loop.
- **Scorer tests** use golden fixtures: a snapshot of a real token's `TokenAnalysis`, the expected score, the reason.

CI runs `npm run lint && npm run typecheck && npm test && npm run build` on every push and PR.

## Entry point

- `src/index.ts` builds the Commander program, attaches the `--chain` global option, registers every command, calls `program.parse()`.
- `package.json` `bin.trenchkit` maps to `./dist/index.js`. After `npm run build`, `npm link` puts `trenchkit` on your `$PATH`.
