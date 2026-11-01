export interface CombatantStats {
  attackSpeed: number
  damage: number
  hp: number
  regen: number
}

export interface FightTally {
  damageDealt: number
  damageTaken: number
  hpRegenerated: number
}

export interface FightCombatant extends CombatantStats {
  currentHp: number
  timeUntilNextAttackMs: number
}

export type FightOutcome = 'champion' | 'enemy'

export interface FightState {
  champion: FightCombatant
  enemy: FightCombatant
  outcome: FightOutcome | undefined
  tally: FightTally
}

function attackIntervalMs(stats: CombatantStats): number {
  return 1000 / stats.attackSpeed
}

function toFightCombatant(stats: CombatantStats, startingHp = stats.hp): FightCombatant {
  return {
    ...stats,
    currentHp: Math.min(startingHp, stats.hp),
    timeUntilNextAttackMs: attackIntervalMs(stats),
  }
}

export function createFight(
  champion: CombatantStats,
  enemy: CombatantStats,
  championStartingHp = champion.hp,
): FightState {
  return {
    champion: toFightCombatant(champion, championStartingHp),
    enemy: toFightCombatant(enemy),
    outcome: undefined,
    tally: { damageDealt: 0, damageTaken: 0, hpRegenerated: 0 },
  }
}

export function regeneratedHp(combatant: CombatantStats, currentHp: number, elapsedMs: number) {
  if (currentHp <= 0) return 0
  return Math.min(combatant.regen * (elapsedMs / 1000), combatant.hp - currentHp)
}

export function advanceFight(fight: FightState, elapsedMs: number): FightState {
  let remainingMs = elapsedMs
  const { champion, enemy, tally } = fight

  while (remainingMs > 0 && fight.outcome === undefined) {
    const stepMs = Math.min(
      champion.timeUntilNextAttackMs,
      enemy.timeUntilNextAttackMs,
      remainingMs,
    )
    champion.timeUntilNextAttackMs -= stepMs
    enemy.timeUntilNextAttackMs -= stepMs
    remainingMs -= stepMs

    const championRegenerated = regeneratedHp(champion, champion.currentHp, stepMs)
    champion.currentHp += championRegenerated
    tally.hpRegenerated += championRegenerated
    enemy.currentHp += regeneratedHp(enemy, enemy.currentHp, stepMs)

    if (champion.timeUntilNextAttackMs <= 0) {
      const dealt = Math.min(enemy.currentHp, champion.damage)
      enemy.currentHp -= dealt
      tally.damageDealt += dealt
      champion.timeUntilNextAttackMs += attackIntervalMs(champion)
    }
    if (enemy.timeUntilNextAttackMs <= 0) {
      const taken = Math.min(champion.currentHp, enemy.damage)
      champion.currentHp -= taken
      tally.damageTaken += taken
      enemy.timeUntilNextAttackMs += attackIntervalMs(enemy)
    }

    if (champion.currentHp <= 0) {
      fight.outcome = 'enemy'
    } else if (enemy.currentHp <= 0) {
      fight.outcome = 'champion'
    }
  }

  return fight
}

const MAX_PREDICTED_FIGHT_MS = 3_600_000

export function predictFightOutcome(first: CombatantStats, second: CombatantStats): FightOutcome {
  const fight = createFight(first, second)
  advanceFight(fight, MAX_PREDICTED_FIGHT_MS)
  if (fight.outcome !== undefined) return fight.outcome
  const firstShare = fight.champion.currentHp / fight.champion.hp
  const secondShare = fight.enemy.currentHp / fight.enemy.hp
  return secondShare > firstShare ? 'enemy' : 'champion'
}
