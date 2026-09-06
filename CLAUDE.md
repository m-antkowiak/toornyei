## Confidence gate

Before responding, rate confidence (0-100%) on three things: what the prompt is asking, what the correct response is, and what work it takes to get there. At 97% or above, proceed. Below 97%, open the reply with a bold line in the form `**Confidence: NN% — <why it's low>**`, then ask the single question that would raise it the most, instead of guessing.

## Code style

Do not add comments to code you write or edit, in any language. Skip docstrings and inline comments alike, even for exported/public functions. Well-named identifiers should carry the meaning instead.

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
