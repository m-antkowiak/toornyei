# toornyei

An incremental (idle) game built around a tournament ladder. You deploy a Champion to climb through a sequence of Enemies, deciding when to commit and when to invest — while the Enemies themselves fight and grow on their own, whether you're watching or not.

## The idea

Classic clickers are mostly about waiting. Toornyei keeps the idle core but puts real decisions in your hands:

- **Climb the Ladder** — a single sequential tournament. Each Fight is auto-resolved in real time (attack speed and damage race it out), so the skill is entirely in *when* you commit your Champion, not in playing the fight itself.
- **Enemies aren't static.** They fight each other autonomously and absorb stats and skills from whoever they beat — the Ladder gets harder over time because the enemy ecosystem is alive, not because of a difficulty curve someone hand-tuned.
- **Every win matters, even the losses.** Fights grant permanent Experience regardless of outcome, so a failed climb still moves you forward. Stats gained mid-run are wiped when the run ends (win or death) — that's what you're playing for *this* run.
- **You control the risk.** Beat an Enemy once, and you can spend Gold to upgrade it — better stats, better rewards — entirely at your own pace.
- **Reset to go again, stronger.** A classic prestige loop: cash in a finished run for permanent upgrades that make the next one faster.

This is early-stage design — see [`CONTEXT.md`](./CONTEXT.md) for the full glossary and what's still undecided (multiple Champions, parallel ladders, and more).

## Tech stack

- [Vue 3](https://vuejs.org/) + TypeScript
- [Vite](https://vite.dev/) for dev/build
- [Pinia](https://pinia.vuejs.org/) for state
- [Vitest](https://vitest.dev/) for testing
- [oxlint](https://oxc.rs/) + [ESLint](https://eslint.org/) for linting, [oxfmt](https://oxc.rs/) for formatting

## Getting started

```sh
npm install
npm run dev
```

### Other commands

```sh
npm run build         # type-check and build for production
npm run test:unit     # run the unit tests
npm run lint          # lint and auto-fix
npm run format        # format src/
```

Requires Node `^22.18.0` or `>=24.12.0`.
