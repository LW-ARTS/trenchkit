# trenchkit — architecture reference

> Deep-dive technical documentation. For product overview, see [README](README.md).

## Project

**trenchkit**

trenchkit is a real-time crypto intelligence pipeline and TUI dashboard built on the GMGN OpenAPI. It turns a public trending feed into a scored, filtered, auditable pipeline that surfaces 3-5 high-conviction tokens per scan cycle, with opt-in signed trading for SOL/BSC/Base. Built for the GMGN Open-Source Case Collection contest (Season 1, deadline 2026-04-23) and as a portfolio piece for LW Arts.

**Core Value:** **Signal, not noise — fast.** A trader running `trenchkit live` sees scored, filtered, smart-money-confirmed tokens in real time without ever touching the GMGN web UI. Everything else is decoration around this.

### Constraints

- **Timeline:** GMGN contest deadline 2026-04-23 — 7 calendar days from project initialization. All in-scope work must ship + be demo-able before that date.
- **Tech stack:** Node.js 22+, TypeScript 6 strict + `exactOptionalPropertyTypes`, ESM-first, Commander 14 for CLI, Ink 7 + React 19 for TUI, Vitest 4 for tests, Biome 2.4 for lint+format, tsup for bundle. No framework substitutions without strong cause.
- **Runtime/rendering:** TUI must stay within GMGN rate-limit budget (sustained ≤0.17 weight/s; peak burst ≤17 weight per research cycle). Panel refresh rates are spec-defined (scanner 30s, SM 60s, clock 1s).
- **Security:** Private key lifecycle rules (Buffer zeroing, no `process.env` persistence, sanitized errors) already encoded in `src/foundation/auth.ts` and `src/foundation/api/client.ts` — Wave 6 must preserve these.
- **Conventions:** Atomic conventional commits (feat/fix/chore/test/docs/style scopes), advisor call before committing to an approach, Biome-clean + type-clean + tests-passing before each commit.
- **Dependencies:** No adding new runtime deps for Wave 6 beyond what `package.json` already declares (ink, react, ink-testing-library). Dev-only tools OK.

## Technology Stack

## Languages
- TypeScript `^6.0.2` (strict) — all source under `src/`, tests under `tests/`.
- TSX (`jsx: "react-jsx"` in `tsconfig.json`) — configured for Wave 6 TUI, **no `.tsx` files exist yet**.
- None. Pure TypeScript / ESM-only codebase.
## Runtime
- Node.js `>=22.0.0` (enforced in `package.json` `engines.node`).
- `@types/node ^25.6.0` (types ahead of runtime target; OK because tsup targets `node22`).
- Uses native Node 22 APIs without polyfills: global `fetch`, `crypto.randomUUID`, `node:events.EventEmitter`, `node:readline/promises`.
- npm (inferred from `package-lock.json` present at repo root, 126KB, committed).
- Lockfile: **present** (`package-lock.json`), committed.
## Frameworks
- `commander` `^14.0.3` — CLI command definition (`src/index.ts:1`). Subcommand pattern, one file per command under `src/commands/`.
- `ink` `^7.0.0` — React renderer for terminals. **Declared but not yet imported** (Wave 6 TUI pending). Pure-ESM package; drives the ESM-first requirement.
- `react` `^19.2.5` — paired with Ink 7. **Declared but not yet imported**.
- `vitest` `^4.1.4` — test runner. Tests co-located under `tests/` mirroring `src/` structure. 17 test files.
- `ink-testing-library` `^4.0.0` — TUI test harness (declared, not yet used).
- `tsup` `^8.5.1` — bundler. Config in `tsup.config.ts`: ESM only, target `node22`, sourcemaps, dts generation, shebang banner `#!/usr/bin/env node`.
- `@biomejs/biome` `^2.4.12` — lint + format (replaces ESLint + Prettier). Config in `biome.json`.
- `typescript` `^6.0.2` — `tsc --noEmit` used for typecheck only; tsup handles emit.
## Key Dependencies
- `@noble/ed25519` `^3.1.0` — Ed25519 signing for GMGN trade endpoints. Zero native deps, used in `src/foundation/auth.ts`.
- `bottleneck` `^2.19.5` — weighted rate limiter with priority queue. Wraps GMGN's `rate=10, capacity=10` leaky bucket. Used in `src/foundation/rate-limiter.ts`.
- `p-retry` `^8.0.0` — declared for GET retry logic. **Currently not imported anywhere in `src/`** — the code implements a one-shot manual retry for `AUTH_TIMESTAMP_EXPIRED` inline (`src/foundation/api/client.ts:157-164`).
- `chalk` `^5.6.2` — ANSI color output. Used throughout `src/foundation/logger.ts` and `src/commands/*.ts`.
- `cli-table3` `^0.6.5` — formatted terminal tables. Used in `src/commands/scan.ts`, `src/commands/research.ts`, `src/commands/trade.ts`, `src/commands/wallet.ts`, `src/commands/smartmoney.ts`.
- `cosmiconfig` `^9.0.1` — declared but **not imported in `src/`**. Config is read/written directly via `node:fs` in `src/foundation/config.ts`.
- `dotenv` `^17.4.2` — declared but **not imported in `src/`**. `.env` contents are parsed manually via regex in `src/foundation/config.ts:51` and `src/foundation/config.ts:82`.
## Configuration
- Credentials live in `~/.config/trenchkit/.env` (`chmod 600`, created by `trenchkit init`):
- User preferences live in `~/.config/trenchkit/config.json` (`chmod 600`):
- Repo `.env.example` documents the shape only; real credentials never live at the repo root.
- Repo-root `.env` and `.env.local` are in `.gitignore`.
- `tsconfig.json` (project root):
- `tsup.config.ts`:
- `biome.json`:
## Platform Requirements
- Node `>=22.0.0`, npm.
- macOS / Linux primary. Windows not explicitly tested (POSIX path assumptions in `~/.config/trenchkit/` setup, `chmod 600`).
- No Docker, no service dependencies. `npm install && npm run build` produces `dist/index.js` directly.
- Global install: `npm install -g trenchkit` → exposes `trenchkit` binary via `package.json` `bin.trenchkit: "./dist/index.js"`.
- Or `npx trenchkit` for one-off usage.
- No deploy target, no CI/CD pipeline (no `.github/workflows` directory).
- End-user requires a GMGN OpenAPI key (https://gmgn.ai/ai).
- **IPv4-only network required** — GMGN API does not support IPv6 (spec §3).
## npm Scripts

## Conventions

## Tooling
- Biome 2.4 (`@biomejs/biome@^2.4.12`) handles BOTH lint and format. No ESLint, no Prettier.
- Config: `biome.json`
- Commands (from `package.json`):
- **Indent:** 2 spaces (no tabs)
- **Line width:** 100 cols
- **Quotes:** double quotes for strings (Biome default), e.g., `import { foo } from "./bar.js"`
- **Trailing commas:** multi-line (Biome default)
- **Semicolons:** always (Biome default)
- **Imports:** organized automatically via `assist.actions.source.organizeImports: "on"`
- TypeScript 6 with `"strict": true` plus additional hardening:
- Module: `"module": "NodeNext"`, `"moduleResolution": "NodeNext"` → ESM-only; imports must use `.js` extensions (see Import Organization).
- Target: `ES2022`, JSX: `react-jsx` (for Ink UI in TUIs)
- `typecheck` script: `tsc --noEmit`
- tsup emits a single ESM bundle to `dist/index.js` with a shebang banner `#!/usr/bin/env node`.
- Targets Node 22+, emits `.d.ts`, no shims.
## Naming Patterns
- `kebab-case.ts` for all source files: `rate-limiter.ts`, `api-types.ts`, `scanner-lifecycle.ts`, `trade-flow.ts`, `smart-money.ts`, `wallet-intel.ts`, `bot-manipulation.ts`, `dev-trust.ts`, `holder-quality.ts`
- Single-word files are lowercase: `auth.ts`, `chain.ts`, `config.ts`, `events.ts`, `format.ts`, `logger.ts`, `types.ts`, `address.ts`, `client.ts`, `token.ts`, `market.ts`, `user.ts`, `trade.ts`
- Barrel files are always `index.ts`
- Test files mirror source as `*.test.ts`: `foundation/api/client.ts` → `tests/foundation/api-client.test.ts` (the test file flattens one level of directory into the filename — see TESTING.md)
- lowercase, no kebab: `foundation/`, `engine/`, `modules/`, `commands/`, `scorers/`, `api/`
- Tests mirror source layout: `src/foundation/` ↔ `tests/foundation/`, `src/engine/scorers/` ↔ `tests/engine/scorers/`
- **Functions, variables, parameters:** `camelCase`
- **Private class methods:** same camelCase as public: `mapTokenInfo`, `mapSecurity`, `mapHolders`, `mapDevHistory`, `mapKlineStability` (see `src/modules/research.ts`)
- **Object fields produced by trenchkit:** camelCase, e.g. `marketCap`, `holderCount`, `isHoneypot`, `isRenounced`, `isFreezeAuthorityRenounced`, `smartMoneyWalletCount` (see `src/foundation/types.ts` — `TokenAnalysis` has ~40 camelCase fields).
- `TokenAnalysis`, `WalletProfile`, `ChainConfig`, `GmgnClient`, `GmgnTokenInfo`, `TradeIntent`, `ExecuteOptions`, `TpSlOptions`, `RateLimiter`, `NormalizedTrade`, `ConvergenceAlert`, `TrenchkitConfig`, `ApiContext`, `RequestOptions`
- Error classes also PascalCase with `Error` suffix: `AuthTimestampExpiredError`, `MaxTradeAmountExceeded`
- Type aliases use PascalCase: `Chain`, `LifecycleStage`, `ConvictionLabel`, `SignalStrength`, `GmgnConditionOrderType`
- `UPPER_SNAKE_CASE` for module-level constants that act as "configuration lookup tables" or limits:
- For enum-like const objects use `Priority = { HIGH: 1, DEFAULT: 5 } as const` pattern (see `src/foundation/rate-limiter.ts`) — PascalCase name, `as const`, no `enum` keyword.
- Raw GMGN API response types mirror the server's wire format exactly — **snake_case** on every field:
- **Why:** request/response bodies are serialized with `JSON.stringify` and sent over the wire unchanged; Ed25519 signing operates on the literal request body bytes, so wire-shape field names are load-bearing and must match the server.
- **Where the boundary is:** `src/modules/research.ts` owns the translation — `mapTokenInfo`, `mapSecurity`, etc. map incoming `snake_case` → domain `camelCase`:
- **Rule:** never introduce `snake_case` in domain code (`TokenAnalysis`, `WalletProfile`, config objects). Never introduce `camelCase` in GMGN request/response bodies. The boundary lives in the module layer.
- `LifecycleStage = "EARLY" | "BREAKOUT" | "DISTRIBUTION" | "DECLINE"`
- `ConvictionLabel = "HIGH" | "MODERATE" | "LOW" | "AVOID"`
- `SignalStrength = "WEAK" | "MEDIUM" | "STRONG" | "VERY_STRONG"`
- Chain identifiers are lowercase strings (`"sol" | "bsc" | "base"`) because GMGN uses them as URL path segments.
## Import Organization
- **Always `.js` extension on relative imports**, even though source files are `.ts` (NodeNext requires explicit extensions and TS rewrites `.ts` → `.js` at emit). Example:
- **No path aliases** (no `@/` or `~/`). All imports are relative: `./foo.js`, `../foundation/types.js`.
- **No barrel-imports from deep internals** when a named export exists in the closer `index.ts` — but modules DO sometimes import directly from sub-files (e.g., `src/engine/pipeline.ts` imports `../modules/scanner.js` directly rather than `../modules/index.js`). Both patterns coexist.
- `import type { ... }` for types-only: used widely, e.g.,
- **Mixed imports with both types and runtime values split into two statements**:
## Module Barrels
- **Type-only re-exports** use `export type { ... } from "..."` when outside modules should read the type but not depend on the implementation file's side effects.
- **Value re-exports** use `export { ... } from "..."` or wildcard `export * from "..."`.
- **No `default` exports anywhere** — named exports only, to keep barrels composable.
- **Mix types and values in a single barrel** — both `src/modules/index.ts` (types AND values for `trade-flow`) and `src/foundation/index.ts` (wildcard for most, types-only for API modules) follow this.
## Error Handling
- There is a retry/no-retry decision dependent on error identity (`AuthTimestampExpiredError` drives GET-retry vs POST-no-retry in `src/foundation/api/client.ts` lines 157–164).
- The caller has a specific recovery path (`MaxTradeAmountExceeded` is caught by CLI to print a config hint).
- For generic I/O/network failures, throw plain `new Error(msg)`.
- The request layer unwraps unknowns via `err instanceof Error ? err.message : String(err)` and re-throws a sanitized `Error` — see `src/foundation/api/client.ts` lines 93–95, 131–132.
- **Never swallow errors silently** EXCEPT in the `ResearchEngine.research()` multi-endpoint fan-out (`src/modules/research.ts` lines 26–97), where each `try { await … } catch { analysis.partialData = true; }` is intentional: partial failure degrades the result, it doesn't abort the report.
- `src/foundation/api/client.ts` line 42:
- **Every error message that could contain the upstream body or URL is scrubbed through `sanitizeApiKey()` before being thrown.** Call sites: lines 95, 118, 122, 132, 138, 140 in `client.ts`.
- **Rule:** any new code in `src/foundation/api/` that builds an error message from a raw upstream payload MUST pass it through `sanitizeApiKey(msg, apiKey)`.
- **Do NOT** log the raw API key anywhere. `src/foundation/config.ts` saves it only to `~/.config/trenchkit/.env` with `chmodSync(..., 0o600)` (owner-only).
- `src/foundation/auth.ts` zeroes the PEM buffer after extracting the 32 raw Ed25519 bytes (`keyBuffer.fill(0)`), then deletes `process.env.GMGN_PRIVATE_KEY` if dotenv loaded it, and exposes `clearKeyMaterial()` to wipe the cached `Uint8Array`.
- When touching this file, preserve the zeroing logic — the private key must not remain in `process.env` or an untyped buffer after `getPrivateKeyBytes()` returns.
- Always use `brand.error(msg)` from `src/foundation/logger.ts` (red + `[ERROR]` prefix via chalk) and set `process.exitCode = 1`, never `process.exit(1)` (lets async cleanup run).
- Pattern (see `src/commands/research.ts` lines 195–199):
## Logging
## Function Design
- Prefer **positional args for required/primary params + a single options object for optional/tunable params**:
- **With `exactOptionalPropertyTypes: true`, assemble the options object conditionally** so `undefined` is never set for absent fields:
- **Never** do `{ limit: options.limit }` when `options.limit` is optional — `exactOptionalPropertyTypes` rejects this.
- Prefer nullable-field objects over throwing when the caller should keep going: `TokenAnalysis` has ~40 `T | null` fields and a `partialData: boolean` flag.
- Prefer narrow slice types (`Pick<TokenAnalysis, "address" | "chain" | "isHoneypot" | ...>`) when a function only reads a subset — see `SecuritySlice`, `HolderSlice`, `SmartMoneySlice`, `DevSlice`, `LiquiditySlice`, `BotSlice` in `src/foundation/types.ts`.
- API sub-clients expose a factory `createTokenApi(ctx: ApiContext): TokenApi` returning an object with closures — no classes for the API layer.
- Classes are used for stateful modules: `ResearchEngine`, `Scanner`, `SmartMoneyTracker`, `WalletIntel`, `Pipeline`.
- Top-level entry: `createGmgnClient(apiKey: string): GmgnClient` composes the four sub-APIs.
- `async`/`await` everywhere; no `.then()` chains.
- Use `await new Promise((r) => setTimeout(r, intervalMs))` for sleeps in polling loops (see `src/modules/trade-flow.ts` line 151).
## Comments
- **Rules/constraints that aren't obvious from the code:**
- **Magic numbers and formulas:**
- **Section headers with box-drawing characters** inside long functions:
- JSDoc blocks `/** */` — trenchkit does not use JSDoc. Types come from TypeScript, not annotations.
- Inline `TODO`/`FIXME` left without a tracking reference.
- "What the code does" comments — prefer "why this is weird" comments.
- User preference: no adapter functions that exist only to avoid breaking existing callers. When an internal API changes, update all call sites and delete the old one. Never leave a wrapper that re-maps an old signature to a new one "just in case".
## Module Design
- `createGmgnClient(apiKey: string): GmgnClient` — top-level
- `createTokenApi(ctx)`, `createMarketApi(ctx)`, `createUserApi(ctx)`, `createTradeApi(ctx)` — sub-APIs fed an `ApiContext`
- `createRateLimiter(config?: RateLimiterConfig): RateLimiter` — returns a plain object with closures
- `ResearchEngine` (`src/modules/research.ts`), `Scanner` (`src/modules/scanner.ts`), `SmartMoneyTracker` (`src/modules/smart-money.ts`), `WalletIntel` (`src/modules/wallet-intel.ts`), `Pipeline` (`src/engine/pipeline.ts`) — constructors take `(client: GmgnClient, chain: Chain)`.
- `TypedEventEmitter<PipelineEvents>` extends `node:events` `EventEmitter` with typed `on`/`emit`/`off` overrides (`src/foundation/events.ts`).
## Git Commits
- Format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `chore`, `test`, `docs`, `style`, `refactor`, `perf`
- Scopes match directory names: `foundation`, `modules`, `engine`, `commands`, `scanner`, `research`, `trade`, `smart-money`, `wallet`, `config`, `auth`
- Example: `feat(trade): add MaxTradeAmountExceeded guard to executeTrade`
- **Atomic:** one logical change per commit. A refactor that also adds a feature gets split into two commits.
- **Keep commits compilable:** each commit should pass `npm run typecheck && npm run lint && npm run test`.

## Architecture

## Pattern Overview
- Dependencies flow downward only: Interface → Engine → Core Modules → Foundation. No upward or sideways imports. Violations are visible in import statements because foundation files have no imports from siblings and modules have no imports from each other.
- Core modules (`src/modules/`) never import each other. Cross-module coordination happens exclusively through typed events published on `pipelineEvents` in `src/foundation/events.ts`.
- Foundation uses factory functions over classes for API bindings (`createGmgnClient`, `createMarketApi`, `createTokenApi`, `createUserApi`, `createTradeApi`, `createRateLimiter`). Modules use classes (`Scanner`, `ResearchEngine`, `SmartMoneyTracker`, `WalletIntel`). Trade flow in `src/modules/trade-flow.ts` is function-based because it is stateless orchestration.
- Engine is optional: read-only command flows (`src/commands/wallet.ts`, `src/commands/trade.ts`) skip the engine and instantiate modules directly. Scoring/filtering flows (`src/commands/scan.ts`, `src/commands/research.ts`) go through the engine.
- ESM-first with `.js` specifier rewriting in imports (`NodeNext` module resolution).
## Layers
- Purpose: CLI surface — translates argv to module/engine calls, renders output with chalk and cli-table3.
- Location: `src/commands/`
- Contains: One file per top-level command. Each exports a `registerXCommand(program: Command)` function that attaches subcommands to the Commander instance.
- Depends on: `src/engine/`, `src/modules/`, `src/foundation/`
- Used by: `src/index.ts` (entry point). Nothing imports commands beyond the entry.
- Files: `src/commands/init.ts`, `src/commands/config.ts`, `src/commands/scan.ts`, `src/commands/wallet.ts`, `src/commands/smartmoney.ts`, `src/commands/research.ts`, `src/commands/trade.ts`
- TUI dashboard (`src/ui/App.tsx`) is pending Wave 6 and does not yet exist.
- Purpose: Orchestrate the scan → filter → research → score pipeline and aggregate dimensional scorers into a conviction score.
- Location: `src/engine/`
- Contains: `Pipeline` class wiring modules together, hard/soft filter predicates, 6 dimension scorers plus an aggregator.
- Depends on: `src/modules/`, `src/foundation/`
- Used by: `src/commands/scan.ts`, `src/commands/research.ts`
- Files: `src/engine/pipeline.ts`, `src/engine/filters.ts`, `src/engine/scorers/index.ts` (aggregator + barrel), `src/engine/scorers/security.ts`, `src/engine/scorers/holder-quality.ts`, `src/engine/scorers/liquidity.ts`, `src/engine/scorers/dev-trust.ts`, `src/engine/scorers/smart-money.ts`, `src/engine/scorers/bot-manipulation.ts`
- Purpose: Domain logic — token scanning, research enrichment, convergence detection, wallet scoring, trade execution.
- Location: `src/modules/`
- Contains: One class per domain (`Scanner`, `ResearchEngine`, `SmartMoneyTracker`, `WalletIntel`) plus the stateless `trade-flow.ts` orchestration module. `scanner-lifecycle.ts` is a pure helper for lifecycle stage classification used by `Scanner`.
- Depends on: `src/foundation/` only
- Used by: `src/engine/pipeline.ts`, `src/commands/*`
- Files: `src/modules/scanner.ts`, `src/modules/scanner-lifecycle.ts`, `src/modules/research.ts`, `src/modules/smart-money.ts`, `src/modules/wallet-intel.ts`, `src/modules/trade-flow.ts`
- Constraint: modules must not import from other modules. The one exception is `scanner.ts` importing `classifyLifecycleStage` from `scanner-lifecycle.ts`, a private helper treated as part of the scanner module rather than a peer.
- Purpose: GMGN API binding, rate limiting, auth signing, chain configuration, event bus, config persistence, formatting primitives. No domain logic lives here.
- Location: `src/foundation/`
- Contains: domain-split GMGN client (`src/foundation/api/client.ts` plus `market.ts`, `token.ts`, `user.ts`, `trade.ts`), the raw GMGN response types in `src/foundation/api-types.ts`, the internal `TokenAnalysis`/`Chain`/`WalletProfile` types in `src/foundation/types.ts`, the typed event emitter in `src/foundation/events.ts`, Ed25519 signing in `src/foundation/auth.ts`, address validation in `src/foundation/address.ts`, Bottleneck wrapper in `src/foundation/rate-limiter.ts`, `CHAINS` abstraction in `src/foundation/chain.ts`, config persistence in `src/foundation/config.ts`, and formatting/log helpers in `src/foundation/format.ts` and `src/foundation/logger.ts`.
- Depends on: Node.js stdlib and external packages only. Has no internal imports upward.
- Used by: all other layers.
## Data Flow
- Scanner keeps an in-process `Map<string, TokenTrack>` of observed tokens with holder and liquidity history arrays capped at 20 points. `Scanner.clearStale(maxAgeSec)` prunes entries older than 2h by default.
- No database, no disk cache. Config persists to `~/.config/trenchkit/.env` and `~/.config/trenchkit/config.json` via `src/foundation/config.ts` with 0600 permissions.
- Private key bytes are cached in-memory in `src/foundation/auth.ts`, extracted once from PEM, with `clearKeyMaterial()` available for teardown. After caching, the key is removed from `process.env`.
## Key Abstractions
- Purpose: Per-chain invariants — native currency symbol, native wrapped address, decimals, explorer URL, and which security fields the chain exposes.
- Examples: `CHAINS.sol`, `CHAINS.bsc`, `CHAINS.base` in `src/foundation/chain.ts`.
- Pattern: lookup table indexed by `Chain` literal union (`'sol' | 'bsc' | 'base'`). Access via `getChainConfig(chain)` or `getExplorerTxUrl(chain, hash)`.
- Drives chain-branching inside scorers. Example: `src/engine/scorers/security.ts` reads `config.applicableSecurityFields` and skips honeypot checks on SOL and freeze/mint-authority checks on EVM chains.
- Purpose: Canonical internal representation of a token across scanning, research, and scoring. ~40 nullable fields so modules can populate what they know and leave the rest null.
- Factory: `createEmptyTokenAnalysis(address, chain)` in `src/foundation/types.ts` returns an all-null shell.
- Slice types (`SecuritySlice`, `HolderSlice`, `SmartMoneySlice`, `DevSlice`, `LiquiditySlice`, `BotSlice`) carve focused subsets when passing to downstream code, to limit coupling.
- `partialData: boolean` marks incomplete datasets so the scorer can cap conviction at 80.
- Purpose: Typed wrapper around `node:events` `EventEmitter` that enforces payload shapes at compile time.
- Pattern: generic `TypedEventEmitter<T>` where `T` is a record mapping event names to payload types.
- Events defined: `convergence:detected` ({ tokenAddress, chain, strength }), `research:complete` ({ tokenAddress, analysis }), `scan:qualified` ({ tokenAddress, chain }).
- Singleton export: `pipelineEvents`. All modules publish and subscribe through this single emitter.
- Purpose: Shared context injected into each domain API factory. Owns the rate limiter and the `request<T>(method, path, options)` function that handles auth, signing, rate limiting, and error shaping.
- Pattern: returned by `createApiContext(apiKey)`, passed to `createMarketApi(ctx)`, `createTokenApi(ctx)`, `createUserApi(ctx)`, `createTradeApi(ctx)`. Domain files never call `fetch` directly.
- Weight system: each API method declares a weight (`weight: 1` for info, `weight: 5` for top_holders) that the rate limiter multiplies against the reservoir.
- Purpose: Composed top-level client with `token`, `market`, `user`, `trade` namespaces. This is what every module consumes.
- Built by `createGmgnClient(apiKey)`.
- Purpose: Thin interface over Bottleneck enforcing GMGN's 10-req-per-second reservoir plus a penalty mode for 429 responses. Also caps in-flight queue depth at 50 to fail fast when overloaded.
## Entry Points
- Triggers: `trenchkit <subcommand>` binary invocation. `package.json` maps `bin.trenchkit` to `./dist/index.js`.
- Responsibilities: Construct the Commander `program`, define the top-level `--chain` option, call each `registerXCommand(program)` function, then `program.parse()`.
- Command registration order is irrelevant; each command is independent.
## Error Handling
- Typed error classes for recoverable control flow: `AuthTimestampExpiredError` (`src/foundation/api/client.ts:12-17`) and `MaxTradeAmountExceeded` (`src/modules/trade-flow.ts:117-125`).
- Selective retry in `src/foundation/api/client.ts:157-163`: on `AuthTimestampExpiredError`, `GET` requests retry once with a fresh timestamp; `POST` requests never retry to avoid double-spend. The trade command's swap path translates this into a user-facing message directing to `trenchkit trade orders` before any resubmission.
- API key redaction: `sanitizeApiKey(message, apiKey)` in `src/foundation/api/client.ts:42-45` strips the key from any error message before throwing. All error paths in the client route through it.
- Research endpoints swallow per-endpoint failures into `analysis.partialData = true` rather than failing the whole research call.
- Rate limit 429 responses read `X-RateLimit-Reset` and call `rateLimiter.applyPenalty(ms)` to block the reservoir until the reset timestamp.
## Cross-Cutting Concerns
- `console.log`, `console.error` only. No logging library.
- `src/foundation/logger.ts` defines the `brand.{header,footer,error,warn,info}` helpers plus score/conviction/signal/grade color functions backed by `chalk`.
- User-facing output uses `cli-table3` tables with custom chalk theming. Compact tables have borderless chars for the scan output (`src/commands/scan.ts:37-55`).
- Address validation is centralized in `src/foundation/address.ts:validateAddress(chain, address)`. Solana uses a Base58 regex (32–44 chars), EVM uses the 40-hex pattern. Shell metacharacters are rejected unconditionally.
- Config value parsing lives in `src/commands/config.ts:set` with per-key validation.
- Ed25519 request signing in `src/foundation/auth.ts`. Private key loaded lazily from `~/.config/trenchkit/.env`, parsed from PEM DER, with the intermediate PEM buffer zeroed after extraction.
- Only trade endpoints sign: `src/foundation/api/trade.ts` passes `sign: true` on `submitSwap`, `getOrderStatus`, and `getStrategyOrders`. All other endpoints use the `X-APIKEY` header only.
- Signing payload: `${path}:${sortedQuerystring}:${body}:${timestamp}` per `src/foundation/auth.ts:47`. Timestamp and `client_id` are always appended to query params.
- Applied inside `ApiContext.request` in `src/foundation/api/client.ts:146-165`. Every HTTP call flows through `rateLimiter.schedule({ weight, priority })`.
- Defaults (in `src/foundation/rate-limiter.ts:12-17`): reservoir 10, refresh every 1s by 10, max queue depth 50.
