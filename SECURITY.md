# Security Policy

## Reporting a vulnerability

Email **lw.arts.designer@gmail.com** with:

- A one-sentence description of the issue.
- Steps to reproduce (commands, payloads, expected vs actual).
- Your assessment of the impact.

**Do not open a public GitHub issue for security reports.**

You should expect an acknowledgment within 48 hours and a status update within 7 days. If the issue is confirmed, trenchkit will ship a fix and credit you in the release notes (unless you prefer to stay anonymous).

## Scope

In scope:

- Anything that lets an attacker execute code in a `trenchkit` process they do not own.
- Anything that leaks the user's `GMGN_API_KEY`, `GMGN_PRIVATE_KEY`, or signed request bodies beyond the GMGN API boundary.
- Anything that lets an attacker trigger a trade or configuration change the user did not authorize.
- Anything that bypasses the `maxTradeAmount` cap.
- Anything that persists the private key to disk, logs, or environment variables longer than the single signing operation requires.

Out of scope:

- Vulnerabilities in the GMGN API itself (report to GMGN).
- Chain-level issues (honeypots, rug pulls, MEV). trenchkit surfaces these in scoring but cannot prevent them.
- Network-level attacks on an untrusted connection the user opted into. Use TLS.
- Issues requiring a compromised local machine. If an attacker has shell on your laptop, trenchkit is not your biggest problem.

## Security posture

trenchkit treats the private key as radioactive. See `src/foundation/auth.ts`:

- Key is loaded lazily from `~/.config/trenchkit/.env` (user creates with chmod 600).
- PEM buffer is zeroed after the raw 32-byte Ed25519 key is extracted.
- The parsed key lives in memory as a `Uint8Array`, cleared by `clearKeyMaterial()` on teardown.
- The key is never written to `process.env`, logs, or child processes.

API keys are redacted from every error message by `sanitizeApiKey()` in `src/foundation/api/client.ts` before the error surfaces to the user.

POST `/swap` is never retried automatically on auth-timestamp-expired or network error. The CLI directs the user to `trenchkit trade orders` to verify execution before resubmitting. This prevents double-spend on non-idempotent POSTs.

## Supported versions

Only the latest `main` is supported. No LTS branches yet.
