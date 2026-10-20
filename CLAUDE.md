## Confidence gate

Before responding, rate confidence (0-100%) on three things: what the prompt is asking, what the correct response is, and what work it takes to get there. At 97% or above, proceed. Below 97%, open the reply with a bold line in the form `**Confidence: NN% — <why it's low>**`, then ask the single question that would raise it the most, instead of guessing.

## Code style

Well-named identifiers carry the meaning, in `src/` and in any language. ESLint (`no-comments/disallowComments`) enforces this.

## Number display

Every gameplay number shown to the player (stats, rewards, costs, Trait amounts, currencies) goes through `formatNumber` from `src/domain/format.ts`. Values come from multiplicative scaling, so raw output looks like `17.490062499999997`; ESLint (`restrict-template-expressions`) rejects numbers inside template literals. Stats that move in small steps, such as attack speed and Trait amounts, pass `2` as the decimals argument so a step like +0.05 stays visible.

## Checks

Run `npm run check` (oxlint, ESLint, oxfmt, `vue-tsc`, vitest; no auto-fix) before reporting work done. LSP does not cover `.vue` files or lint.

## Code Intelligence

Prefer LSP over Grep/Glob/Read for code navigation:
- `goToDefinition` / `goToImplementation` to jump to source
- `findReferences` to see all usages across the codebase
- `workspaceSymbol` to find where something is defined
- `documentSymbol` to list all symbols in a file
- `hover` for type info without reading the file
- `incomingCalls` / `outgoingCalls` for call hierarchy

Before renaming or changing a function signature, use
`findReferences` to find all call sites first.

Use Grep/Glob only for text/pattern searches (comments,
strings, config values) where LSP doesn't help.

After writing or editing code, check LSP diagnostics before
moving on. Fix any type errors or missing imports immediately.

## Agent skills

### Issue tracker

Issues live as GitHub Issues in `m-antkowiak/toornyei`, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), plus `needs-grilling`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
