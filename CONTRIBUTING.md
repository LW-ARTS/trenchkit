# Contributing to trenchkit

Thanks for considering a contribution. trenchkit ships fast and stays honest. These are the ground rules.

## Setup

```bash
git clone https://github.com/LW-ARTS/trenchkit.git
cd trenchkit
npm install
npm run build
npm link          # so `trenchkit` on your PATH points at your local build
```

You need a GMGN OpenAPI key (free, https://gmgn.ai/ai) to run analysis commands end to end.

## Before you open a PR

All four must pass:

```bash
npm run lint        # Biome, zero tolerance
npm run typecheck   # tsc --noEmit, TypeScript 6 strict + exactOptionalPropertyTypes
npm test            # Vitest, 333 tests and climbing
npm run build       # tsup produces dist/index.js
```

CI runs the same four on every push and PR.

## Commit style

Conventional commits with directory-matching scopes:

```
feat(ui): add convergence panel expand-on-hover
fix(foundation): correct GMGN user endpoint paths
test(modules): cover NormalizedTrade boundary coercion
docs(readme): rewrite hook for trader audience
refactor(engine): inline scorer aggregator into pipeline
chore(ci): bump node matrix to 22 and 24
```

Types: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`, `perf`, `style`.

Atomic commits please. A refactor that also adds a feature ships as two commits. Each commit should pass the four checks above.

## Adding features

- **No new runtime deps without a reason in the PR description.** Dev dependencies are fine.
- **Scorer weight changes must include a benchmark.** Show a sample of tokens with old and new scores, explain why the new weights read the market better.
- **New GMGN endpoints follow the domain-split pattern.** Put them in `src/foundation/api/{token,market,user,trade}.ts`. Wire weight accounting. Add the fixture and test.
- **UI panels follow the slice-context pattern.** Subscribe to the narrowest context you need. A clock tick should never re-render your panel.

## Reporting a security issue

**Do not open a public issue.** Email lw.arts.designer@gmail.com with:

- What the issue is (one sentence).
- How to reproduce (commands, request payload, expected vs actual).
- Your assessment of the blast radius.

Expect a response within 48 hours. See [SECURITY.md](SECURITY.md) for the full policy.

## Architecture reference

The [ARCHITECTURE.md](ARCHITECTURE.md) file is the deep dive. It documents the four layers, naming conventions, error-handling patterns, and where the boundaries are. Read it before restructuring anything.

## Questions

Open a [discussion](https://github.com/LW-ARTS/trenchkit/discussions) or DM [@LWARTSS](https://twitter.com/LWARTSS). Low-friction by design.
