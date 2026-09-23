import type { CombatantStats } from './fight'

const LADDER_LEVEL_SCALING_FACTOR = 1.15

export function ladderLevelStats(stats: CombatantStats, ladderLevel: number): CombatantStats {
  const multiplier = LADDER_LEVEL_SCALING_FACTOR ** ladderLevel
  return {
    attackSpeed: stats.attackSpeed,
    damage: stats.damage * multiplier,
    hp: stats.hp * multiplier,
  }
}
