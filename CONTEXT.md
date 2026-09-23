# toornyei

An incremental (idle) game built around a tournament ladder: the player deploys champions to fight through a sequence of enemies, choosing when to commit each one, while unlocks and prestige resets deepen the strategy over time.

## Language

**Champion**:
A unit owned and deployed by the player. The player decides when to commit a champion to a fight on the Ladder. The starting roster is exactly one champion.
_Avoid_: Hero, unit, fighter (as a generic term — "champion" is the canonical name for player-owned combatants)

**Enemy**:
An occupant of a Bracket slot that a Champion can fight. Every Enemy is an instance of an Enemy type from a fixed, developer-authored catalog (`domain/catalog.ts`); the player chooses which type goes into each slot during Setup. Enemies share the same stat schema as Champions and fight each other inside the Bracket, independent of the player: a winning Enemy absorbs the loser's Traits, experience value and gold value (see Trait), and the loser is zeroed. That contest, not the Champion alone, decides how strong the opponent is by the time the Champion reaches it.
_Avoid_: Monster, opponent (as the canonical term)

**Enemy type**:
One entry of the fixed Enemy catalog: base stats, one authored baseline Trait, and experience and gold values. The catalog is developer-defined; players place types but cannot author new ones. Persisted per-type progress (Enemy Upgrades) is keyed by Enemy type, not by position.
_Avoid_: Enemy class, template

**Ladder**:
The Champion's climb through the Bracket: one Fight per round, in order. The Ladder is the Champion's own path; the Bracket is the whole structure it climbs through. Ladder Level (see Prestige) is the global difficulty multiplier applied to every Enemy. Additional Ladder types unlocking later is a deferred idea, not yet a committed feature.
_Avoid_: dungeon, track

**Bracket**:
A single-elimination tournament of `2 ** levels` participants, the Champion in slot 0 and Enemies in the rest, so with the default 4 levels it has 16 slots and the player places 15 Enemies. Adjacent slots meet in pairs; each winner advances and the winner's Traits, experience and gold are absorbed from the loser (see Trait). The Champion fights once per round against the winner of its neighbouring block: round 1 is the Enemy in slot 1, round 2 the winner of slots 2 and 3, round 3 the winner of slots 4 to 7, round 4 the winner of slots 8 to 15. If that opponent has not yet finished its own duels the Champion waits for it. Resolution lives in `domain/ecosystem.ts` as pure functions; the run store drives the duels in real time. This deliberately reverses the project's earlier "no branching, continuous ecosystem" framing; the reversal was confirmed by the project owner (see #13).
_Avoid_: Tree, tournament (as the canonical term)

**Fight**:
A tick-based race between a Champion and the Enemy it meets in its Bracket match for the current round. Each combatant has an attack interval and damage stat, and attacks automatically at that cadence until one side's HP reaches zero. No player interaction occurs during a Fight; all strategy is in pre-fight Setup (which Enemy types go where, when to commit).
_Avoid_: Battle, combat (as the canonical term for this specific mechanic)

**Trait**:
A stat bonus — one of Attack Speed, Damage, or HP, plus a fixed amount — that a combatant carries and that directly buffs its own live combat stat for as long as it's held. Every Enemy type has a unique, authored baseline Trait. When one combatant defeats another (Champion beating an Enemy, or one Enemy beating another in the Bracket), the winner takes the loser's entire current Trait set; Traits of the same stat type combine by simple addition. Deliberately uncapped in count and magnitude — growth is meant to feel unbounded and "OP," with balance addressed later, if at all, through a possible Ladder-tiers structure (see Open threads) rather than a cap on Traits themselves. Traits reset to each Enemy's original baseline, and the Champion loses everything it inherited, whenever a Restart or Prestige happens.
_Avoid_: Stat absorption, skill (as the mechanic name — "Trait" is the canonical term for what gets carried and inherited; a future emergent-ability layer on top of this is tracked separately, see "Skill acquisition / mutation" in Open threads)

**Run**:
A single playthrough, from the Champion's starting stats and a freshly built Bracket until the Champion dies in a Fight or wins the final round. A Run is in one of four states: setup (no Run committed, placement editable), active, defeated, or victorious. Pressing Commit to Fight requires a complete placement, locks it, and starts the Run: after that Fights chain automatically, with a cooldown after each win, until the Champion loses or wins the final round. A loss ends the Run with no cooldown and no automatic restart; the player then chooses Restart or Edit. Winning the final round leaves the Run victorious, where the player can Restart, Edit, or Prestige.
_Avoid_: Attempt, playthrough (as the canonical term; fine as informal description)

**Enemy Upgrade**:
Currently shelved: the Gold-funded per-Enemy upgrade is not offered to the player, while the gameplay loop is settled around Champion Upgrades, and its design is to be revisited later. The definition below is the last agreed design, not a live feature. A player-purchased upgrade, paid for with Gold, that increases a specific Enemy's stats and the rewards it grants on defeat. Only available for Enemies the Champion has already defeated at least once — an unbeaten Enemy can't be pre-upgraded. This is the primary player-controlled difficulty/reward lever, applied at the player's own pace, replacing unbounded autonomous Enemy self-scaling as the intended mechanic. Because the Champion only ever inherits an Enemy's Traits once (on defeating it, within a Run that then ends on the Champion's next loss), an Enemy Upgrade bought in one Run only pays off in the *next* Run, when a fresh Bracket is built from the persisted per-type progress.
_Avoid_: Enemy scaling (as the primary mechanic name — that term now refers to the deprioritized autonomous idea, see Open threads)

**Champion Upgrade**:
A player-purchased, repeatable upgrade paid for with Experience that permanently raises one of the Champion's base stats within the current Prestige cycle. There are exactly three, one per stat: Damage, Attack Speed, and HP. Each is bought and leveled independently, each level costs more than the last, and each level adds a flat amount to its stat. Levels survive a Restart but are cleared by Prestige (and by a hard reset), together with the Experience that funds them. The current costs and step sizes are a first-pass placeholder to make the basic gameplay loop feel playable, expected to be tuned later.
_Avoid_: Stats (as the name of this upgrade), Enemy Upgrade (a different, Gold-funded mechanic — see Enemy Upgrade)

**Setup**:
The state before a Run is committed, in which the player places Enemy types into the Bracket's Enemy slots, and can save the placement under a name or load a saved one (a load copies into the working placement and never edits the saved slot). Setup mode is derived from the Run being in its setup state, with no manual toggle, and placement is locked as soon as a Run is committed. Saved setups persist across reloads; the working placement does not.
_Avoid_: Loadout, draft

**Restart**:
A player-chosen action available once a Run has ended, whether in defeat or victory: it immediately begins a new Run with the same placement (Champion back to base stats with no inherited Traits, Enemies rebuilt from their authored baseline plus permanent Enemy Upgrades). A Restart grants nothing — no prestige token, no Ladder Level. Gold, Experience, Champion Upgrades, and Enemy Upgrades survive because they live in the Progression store. There is no automatic Restart after a loss.
_Avoid_: Reset (an earlier term that conflated Restart and Prestige — do not use it for either)

**Edit**:
The other post-Run choice, offered alongside Restart: return to Setup with the previous placement kept and unlocked so the player can revise it before committing again. Like Restart it grants nothing and resets the Champion.
_Avoid_: Reset

**Prestige**:
The player-clicked action available only after the Champion has won the final round. It grants exactly 1 prestige token and permanently increments the global Ladder Level, then returns to Setup with the placement kept and unlocked. Never available after a defeat. The unique/fun twist on this classic prestige shape is still deferred.
_Avoid_: Reset

**Experience**:
A currency spent on Champion Upgrades, held in a separate Progression store, independent of Run state. It survives a Restart but is cleared by Prestige (and by a hard reset), so it is not permanent across Prestige cycles. Rather than a flat per-Fight amount, each Enemy carries its own `experienceValue`, seeded at authoring time; this grows exactly like a Trait does when Enemies fight each other in the autonomous ecosystem (winner takes the loser's current value, loser resets to zero). Defeating an Enemy in a Champion Fight banks that Enemy's current `experienceValue` — passed through a swappable formula keyed to how far up the Ladder it was reached — into the Progression store. A Fight *loss* grants no new Experience; Experience already banked from earlier wins in that Run is unaffected, since it lives outside the Run store and survives the Run ending. This is a deliberate reversal of an earlier flat "granted win or loss" design: the player is still guaranteed some Experience-earning path per Run because early/weaker Enemies stay reliably beatable, but the loss itself now pays nothing further.
_Avoid_: XP as the canonical term (fine as shorthand), Stats (Experience and Stats are distinct resources — see Stats)

## Open threads (not yet resolved)

- How/when the Champion roster grows beyond the starting one.
- Whether multiple Champions will eventually be deployable across multiple concurrent Ladders (explicitly deferred by the user, not decided against).
- The full stat list beyond Attack Speed, Damage, and (implied) HP.
- What resource funds "upgrades" (a stated core feature) — the user has not committed to Gold's role here yet.
- The unique/fun mechanic layered onto Prestige, beyond the classic prestige shape.
- **Enemy self-experience** (deprioritized): the idea that Enemies independently accrue their own experience, scaling their stats and death-rewards with no player involvement, was considered and explicitly de-prioritized — unbounded autonomous scaling risks softlocking the player with no way to catch up. Might return later as a minor/background element ("suggestions"), not a core mechanic.
- **Skill acquisition / mutation**: when a combatant acquires a Trait (see Language) that combines with one it already holds, the result may sometimes be an emergent ability rather than a flat additive combination (example given: a fast-attack-speed Trait combining with a high-damage Trait could yield a "double attack %" chance) — not necessarily limited to two Traits of the same stat type. Explicitly tentative and long-horizon — flagged as unpolished and still being designed, potentially game-defining. Simple same-stat-type Traits combining by addition (see Trait) is the placeholder behavior until this is designed.
- **Placement strategy**: the Bracket and Setup (see Language) landed the mechanical half of what used to be tracked here as "Ladder reordering": the player now places Enemy types into slots. What is still open is whether the catalog is rich enough (only five placeholder types today) for placement to be a real decision, and the deferred ideas of drag-to-swap after placement and Bracket-size unlocks tied to meta-progression.
- **Ladder tiers/layers**: a possible future structure (exact shape and name undecided) for keeping the deliberately uncapped Trait growth (see Trait) manageable over a long Run, rather than adding a cap to Traits themselves. Not yet designed.
- **Gold**: granted per Ladder cleared, spent on Enemy Upgrades (resolved). Whether it also has other uses (the earlier "buildings" idea, "waging"/wagering) is still unconfirmed. The user is explicitly unsure of its purpose — floated ideas include spending it during a run (lost on Restart or Prestige like Stats) and/or spending it on persistent "buildings" that survive Reset. Also unresolved: what "waging" gold means (possibly a wagering/betting mechanic on Fight outcomes, possibly a typo for something else) — not worth sharpening until the Gold mechanic itself is decided.
- **Experience scaling formula**: The level-scaling formula applied to an Enemy's `experienceValue` on defeat (`domain/experience.ts`'s `experienceReward`) starts as a basic multiplier tied to the Bracket round reached (plus Ladder Level). Explicitly flagged as a placeholder — a more interesting/"fun" curve may replace it later, but that's deprioritized until well into development; the function is kept isolated and swappable for exactly this reason. Its level input is the Champion's round index plus Ladder Level, switched from the old rung index when the Bracket landed (#13).
- **Ladder view layout**: Was a plain ordered list (rung stats + Cleared/Champion here/Locked marker); resolved via a prototype session comparing three structural variants live against the real store data — a vertical bracket tree, collapsed rung rows that expand on hover, and a horizontal stepper with a persistent side-rail stat panel. The bracket tree was rejected for forcing scrolling as the ladder grows; the hover-to-expand variant was rejected for hiding stats behind a hover state; the stepper-plus-side-rail layout won on structure and is now implemented in `FightView.vue`. The full set of variants and the reasoning behind the verdict is preserved on the `prototype/ladder-view-layout` branch (not in main). The session surfaced a sharper open question: none of the three layouts had any way to show Enemies progressing against each other over time. The Bracket now simulates that ecosystem, and the pannable, zoomable canvas planned in #17 to #19 is the intended answer to the scrolling objection that sank the tree layout.
- **Bracket UI** (tracked as issues): #17 canvas shell and fixed HUD (blocked on choosing a pan/zoom library), #18 setup mode with the Enemy drawer, drag and click placement and saved setups, #19 node detail and match history (needs the resolver to record who each winner beat).

- **Post-click-fatigue progression roadmap** (2026-09-17 session): four future epics to make late-game progression more than "just clicking," tracked as GitHub issues rather than detailed here — Rung modifiers (#14), Prestige token + Ladder Level + new meta store (#7, fully specced via a 2026-09-21 `/grilling` pass — ready for agent), Per-aspect Champion experience with per-stat automation (#15), Blood/bones drops → buildings/altars (#16, least designed of the four). Priority order: #14/#7 first, #15 second, #16 last. #14, #15, #16 still have sub-decisions explicitly open — see each issue's "deferred" section.

## Explicitly deferred (not building now)

- **Offline progress**: the Ladder does not simulate time while the app/tab is fully closed. A future "online" mode may add this. The app must, however, keep ticking in real time while merely backgrounded (a different browser tab focused), not just while foregrounded.
- **UI polish and finesse**: the current build phase is scoped to functionality and prototyping only — mechanics, state, and logic. Visual design, styling, and UX polish are explicitly out of scope until the underlying game systems are proven out.
