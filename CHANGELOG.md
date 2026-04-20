# Changelog

All notable changes to trenchkit are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0] 2026-04-20

First public release, built for the GMGN Open-Source Case Collection Season 1.

### Added
- **Scanner**: trending-feed scan with hard filters (liquidity, honeypot, dev rug ratio, top-10 holder) and a 6-dimension conviction score.
- **Wallet Intel**: 5-dimension wallet profile — win rate, profit factor, activity, diversification, token quality.
- **Smart Money feed**: live KOL and Smart Money trade stream with optional `--convergence` to surface multi-wallet buy signals.
- **Research**: 7-endpoint deep dive with per-dimension grades and conviction score.
- **Live dashboard**: Ink 7 + React 19 4-panel TUI (Scanner, Smart Money, Convergence, Research) with keyboard navigation and per-slice contexts so clock ticks never re-render data panels.
- **Trade** (opt-in): Ed25519-signed swap flow with server-side TP/SL via GMGN `condition_orders`.
- **Bottleneck rate limiter** with priority queue and 429 penalty mode honoring `X-RateLimit-Reset`.
- **Typed event bus** (`pipelineEvents`) for cross-module coordination.
- **Config persistence**: `~/.config/trenchkit/.env` and `~/.config/trenchkit/config.json`, both chmod 600.
- **Chains**: Solana, BSC, Base with chain-aware address validation, security fields, and fee handling.
- **CI** on every push and PR: `lint + typecheck + test + build` on Node 22.

### Security
- Private key lifecycle: PEM buffer zeroed after raw-bytes extraction, never written to `process.env`, wipeable via `clearKeyMaterial()` on teardown.
- API key redacted from every error message at the boundary (`sanitizeApiKey()`).
- `POST /swap` never retries on auth-timestamp-expired or network error; CLI directs the user to verify execution before resubmitting (prevents double-spend).
- `maxTradeAmount` cap enforced even when `--yes` skips the prompt.

[0.1.0]: https://github.com/LW-ARTS/trenchkit/releases/tag/v0.1.0
