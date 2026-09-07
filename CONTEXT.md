# toornyei

An incremental (idle) game built around a tournament ladder: the player deploys champions to fight through a sequence of enemies, choosing when to commit each one, while unlocks and prestige resets deepen the strategy over time.

## Language

**Champion**:
A unit owned and deployed by the player. The player decides when to commit a champion to a fight on the Ladder. The starting roster is exactly one champion.
_Avoid_: Hero, unit, fighter (as a generic term — "champion" is the canonical name for player-owned combatants)

**Enemy**:
A wild occupant of the Ladder that a Champion can fight. Enemies share the same stat schema as Champions and continuously fight each other autonomously, independent of the player: a winning Enemy absorbs the loser's Traits (see Trait). This ongoing ecosystem, not pre-authored placement, is what makes the Ladder harder the further up it goes.
_Avoid_: Monster, opponent (as the canonical term)

**Ladder**:
The single sequential tournament structure the player climbs, fighting through Enemies in fixed order, one rung at a time. No branching paths and no concurrent ladders in the base design; additional Ladder types unlocking later is a deferred idea, not yet a committed feature. Difficulty is not pre-authored per rung — it emerges from the ongoing Enemy-vs-Enemy ecosystem (see Enemy, Trait).
_Avoid_: Bracket, dungeon, track — "bracket" in particular was an early loose term for this and has been superseded by "Ladder"

**Fight**:
A tick-based race between a Champion and an Enemy occupying the same Ladder rung. Each combatant has an attack interval and damage stat, and attacks automatically at that cadence until one side's HP reaches zero. No player interaction occurs during a Fight; all strategy is in pre-fight setup (which Champion, when to commit).
_Avoid_: Battle, combat (as the canonical term for this specific mechanic)

**Trait**:
A stat bonus — one of Attack Speed, Damage, or HP, plus a fixed amount — that a combatant carries and that directly buffs its own live combat stat for as long as it's held. Every Enemy has a unique, authored baseline Trait. When one combatant defeats another (Champion beating an Enemy, or one Enemy beating another in the autonomous ecosystem), the winner takes the loser's entire current Trait set; Traits of the same stat type combine by simple addition. Deliberately uncapped in count and magnitude — growth is meant to feel unbounded and "OP," with balance addressed later, if at all, through a possible Ladder-tiers structure (see Open threads) rather than a cap on Traits themselves. Traits reset to each Enemy's original baseline, and the Champion loses everything it inherited, whenever a Reset happens.
_Avoid_: Stat absorption, skill (as the mechanic name — "Trait" is the canonical term for what gets carried and inherited; a future emergent-ability layer on top of this is tracked separately, see "Skill acquisition / mutation" in Open threads)

**Run**:
A single playthrough, from the Champion's starting stats and the Ladder's baseline state until the Champion dies in a Fight or clears every rung. A Fight loss now ends the Run outright — there is no re-committing against the same Enemy afterward. Either ending (death or clearing the Ladder) puts the Run into a concluded state that only a Reset can move past.
_Avoid_: Attempt, playthrough (as the canonical term; fine as informal description)

**Enemy Upgrade**:
A player-purchased upgrade, paid for with Gold, that increases a specific Enemy's stats and the rewards it grants on defeat. Only available for Enemies the Champion has already defeated at least once — an unbeaten Enemy can't be pre-upgraded. This is the primary player-controlled difficulty/reward lever, applied at the player's own pace, replacing unbounded autonomous Enemy self-scaling as the intended mechanic. Because the Champion only ever inherits an Enemy's Traits once (on defeating it, within a Run that then ends on the Champion's next loss), an Enemy Upgrade bought in one Run only pays off via the bigger Trait inherited the *next* Run, after a Reset.
_Avoid_: Enemy scaling (as the primary mechanic name — that term now refers to the deprioritized autonomous idea, see Open threads)

**Reset**:
The prestige action, and — for now — the only way to begin a new Run once one has concluded (win or death). Reset wipes the current Run's Champion progress (including all inherited Traits, back to base stats), Ladder progress (Enemies revert to their own authored baseline Traits), and run currency, and is meant to grant a new prestige currency (scaled to how far the run got) that buys permanent upgrades carried into future runs — that payout and the permanent-upgrade purchase flow are not built yet (see Open threads); the current scope is just the wipe-and-reinitialize half. The specific fun/unique twist on this classic shape is also still deferred.
_Avoid_: Prestige (used interchangeably for now, but "Reset" is the in-repo canonical term)

**Experience**:
A permanent meta-progression currency granted per Fight, regardless of whether the Champion won or lost that Fight. Unlike Stats, Experience survives Reset, so a failed run still yields lasting progress — this is also what makes a Run ending outright on a single Fight loss feel fair rather than punishing.
_Avoid_: XP as the canonical term (fine as shorthand), Stats (Experience and Stats are distinct resources — see Stats)

## Open threads (not yet resolved)

- How/when the Champion roster grows beyond the starting one.
- Whether multiple Champions will eventually be deployable across multiple concurrent Ladders (explicitly deferred by the user, not decided against).
- The full stat list beyond Attack Speed, Damage, and (implied) HP.
- What resource funds "upgrades" (a stated core feature) — the user has not committed to Gold's role here yet.
- The unique/fun mechanic layered onto Reset, beyond the classic prestige shape.
- **Enemy self-experience** (deprioritized): the idea that Enemies independently accrue their own experience, scaling their stats and death-rewards with no player involvement, was considered and explicitly de-prioritized — unbounded autonomous scaling risks softlocking the player with no way to catch up. Might return later as a minor/background element ("suggestions"), not a core mechanic.
- **Skill acquisition / mutation**: when a combatant acquires a Trait (see Language) that combines with one it already holds, the result may sometimes be an emergent ability rather than a flat additive combination (example given: a fast-attack-speed Trait combining with a high-damage Trait could yield a "double attack %" chance) — not necessarily limited to two Traits of the same stat type. Explicitly tentative and long-horizon — flagged as unpolished and still being designed, potentially game-defining. Simple same-stat-type Traits combining by addition (see Trait) is the placeholder behavior until this is designed.
- **Ladder reordering**: after a Reset, the player may be able to choose or rearrange which Enemy occupies which rung, as a strategic layer on top of Trait placement. Flagged as a near-term priority — sooner than mutation, considered must-have core gameplay — but not yet designed; needs its own grilling pass once there are enough Enemies and Traits for placement to matter.
- **Ladder tiers/layers**: a possible future structure (exact shape and name undecided) for keeping the deliberately uncapped Trait growth (see Trait) manageable over a long Run, rather than adding a cap to Traits themselves. Not yet designed.
- **Gold**: granted per Ladder cleared, spent on Enemy Upgrades (resolved). Whether it also has other uses (the earlier "buildings" idea, "waging"/wagering) is still unconfirmed. The user is explicitly unsure of its purpose — floated ideas include spending it during a run (lost on Reset like Stats) and/or spending it on persistent "buildings" that survive Reset. Also unresolved: what "waging" gold means (possibly a wagering/betting mechanic on Fight outcomes, possibly a typo for something else) — not worth sharpening until the Gold mechanic itself is decided.
- **Ladder view layout**: `FightView` currently renders the full Ladder as a plain ordered list (rung stats + Cleared/Champion here/Locked marker) so the whole structure and the Champion's progress are visible in one view without pagination. This is a functional placeholder, not a settled design — flagged by the user to be triaged/refined/grilled later, likely once more Ladder-related mechanics (Enemy Upgrades, Reset) land and there's more to actually show per rung.

## Explicitly deferred (not building now)

- **Offline progress**: the Ladder does not simulate time while the app/tab is fully closed. A future "online" mode may add this. The app must, however, keep ticking in real time while merely backgrounded (a different browser tab focused), not just while foregrounded.
- **UI polish and finesse**: the current build phase is scoped to functionality and prototyping only — mechanics, state, and logic. Visual design, styling, and UX polish are explicitly out of scope until the underlying game systems are proven out.
