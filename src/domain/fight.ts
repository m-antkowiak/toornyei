export interface CombatantStats {
  attackSpeed: number
  damage: number
  hp: number
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
}

function attackIntervalMs(stats: CombatantStats): number {
  return 1000 / stats.attackSpeed
}

function toFightCombatant(stats: CombatantStats): FightCombatant {
  return {
    ...stats,
    currentHp: stats.hp,
    timeUntilNextAttackMs: attackIntervalMs(stats),
  }
}

export function createFight(champion: CombatantStats, enemy: CombatantStats): FightState {
  return {
    champion: toFightCombatant(champion),
    enemy: toFightCombatant(enemy),
    outcome: undefined,
  }
}

export function advanceFight(fight: FightState, elapsedMs: number): FightState {
  let remainingMs = elapsedMs
  const { champion, enemy } = fight

  while (remainingMs > 0 && fight.outcome === undefined) {
    const stepMs = Math.min(champion.timeUntilNextAttackMs, enemy.timeUntilNextAttackMs, remainingMs)
    champion.timeUntilNextAttackMs -= stepMs
    enemy.timeUntilNextAttackMs -= stepMs
    remainingMs -= stepMs

    if (champion.timeUntilNextAttackMs <= 0) {
      enemy.currentHp = Math.max(0, enemy.currentHp - champion.damage)
      champion.timeUntilNextAttackMs += attackIntervalMs(champion)
    }
    if (enemy.timeUntilNextAttackMs <= 0) {
      champion.currentHp = Math.max(0, champion.currentHp - enemy.damage)
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
