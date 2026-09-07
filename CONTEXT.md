# toornyei

An incremental (idle) game built around a tournament ladder: the player deploys champions to fight through a sequence of enemies, choosing when to commit each one, while unlocks and prestige resets deepen the strategy over time.

## Language

**Champion**:
A unit owned and deployed by the player. The player decides when to commit a champion to a fight on the Ladder. The starting roster is exactly one champion.
_Avoid_: Hero, unit, fighter (as a generic term — "champion" is the canonical name for player-owned combatants)

**Enemy**:
A wild occupant of the Ladder that a Champion can fight. Enemies share the same stat schema as Champions and continuously fight each other autonomously, independent of the player: a winning Enemy absorbs stats and skills from the Enemy it defeated. This ongoing ecosystem, not pre-authored placement, is what makes the Ladder harder the further up it goes.
_Avoid_: Monster, opponent (as the canonical term)

**Ladder**:
The single sequential tournament structure the player climbs, fighting through Enemies in fixed order, one rung at a time. No branching paths and no concurrent ladders in the base design; additional Ladder types unlocking later is a deferred idea, not yet a committed feature. Difficulty is not pre-authored per rung — it emerges from the ongoing Enemy-vs-Enemy ecosystem (see Enemy).
_Avoid_: Bracket, dungeon, track — "bracket" in particular was an early loose term for this and has been superseded by "Ladder"

**Fight**:
A tick-based race between a Champion and an Enemy occupying the same Ladder rung. Each combatant has an attack interval and damage stat, and attacks automatically at that cadence until one side's HP reaches zero. No player interaction occurs during a Fight; all strategy is in pre-fight setup (which Champion, when to commit).
_Avoid_: Battle, combat (as the canonical term for this specific mechanic)

**Enemy Upgrade**:
A player-purchased upgrade, paid for with Gold, that increases a specific Enemy's stats and the rewards it grants on defeat. Only available for Enemies the Champion has already defeated at least once — an unbeaten Enemy can't be pre-upgraded. This is the primary player-controlled difficulty/reward lever, applied at the player's own pace, replacing unbounded autonomous Enemy self-scaling as the intended mechanic.
_Avoid_: Enemy scaling (as the primary mechanic name — that term now refers to the deprioritized autonomous idea, see Open threads)

**Reset**:
The prestige action: wipes the current run's Champion progress, Ladder progress, and run currency, and grants a new prestige currency (scaled to how far the run got) that buys permanent upgrades carried into future runs. The specific fun/unique twist on this classic shape is deferred.
_Avoid_: Prestige (used interchangeably for now, but "Reset" is the in-repo canonical term)

**Experience**:
A permanent meta-progression currency granted per Fight, regardless of whether the Champion won or lost that Fight. Unlike Stats, Experience survives Reset, so a failed run still yields lasting progress.
_Avoid_: XP as the canonical term (fine as shorthand), Stats (Experience and Stats are distinct resources — see Stats)

## Open threads (not yet resolved)

- How/when the Champion roster grows beyond the starting one.
- Whether multiple Champions will eventually be deployable across multiple concurrent Ladders (explicitly deferred by the user, not decided against).
- The full stat list beyond Attack Speed, Damage, and (implied) HP.
- What resource funds "upgrades" (a stated core feature) — the user has not committed to Gold's role here yet.
- The unique/fun mechanic layered onto Reset, beyond the classic prestige shape.
- **Enemy self-experience** (deprioritized): the idea that Enemies independently accrue their own experience, scaling their stats and death-rewards with no player involvement, was considered and explicitly de-prioritized — unbounded autonomous scaling risks softlocking the player with no way to catch up. Might return later as a minor/background element ("suggestions"), not a core mechanic.
- **Skill acquisition / mutation**: when one Enemy defeats another, it may gain an emergent ability derived from the specific combination of traits involved (example given: a fast-attack-speed Enemy killing a high-damage Enemy could yield a "double attack %" chance) rather than a flat stat merge. Explicitly tentative — the user flagged this as unpolished and still being designed, described as potentially game-defining.
- **Gold**: granted per Ladder cleared, spent on Enemy Upgrades (resolved). Whether it also has other uses (the earlier "buildings" idea, "waging"/wagering) is still unconfirmed. The user is explicitly unsure of its purpose — floated ideas include spending it during a run (lost on Reset like Stats) and/or spending it on persistent "buildings" that survive Reset. Also unresolved: what "waging" gold means (possibly a wagering/betting mechanic on Fight outcomes, possibly a typo for something else) — not worth sharpening until the Gold mechanic itself is decided.

## Explicitly deferred (not building now)

- **Offline progress**: the Ladder does not simulate time while the app/tab is fully closed. A future "online" mode may add this. The app must, however, keep ticking in real time while merely backgrounded (a different browser tab focused), not just while foregrounded.
- **UI polish and finesse**: the current build phase is scoped to functionality and prototyping only — mechanics, state, and logic. Visual design, styling, and UX polish are explicitly out of scope until the underlying game systems are proven out.
