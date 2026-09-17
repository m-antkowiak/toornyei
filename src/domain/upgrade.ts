import type { CombatantStats } from './fight'

const BASE_UPGRADE_COST = 20
const UPGRADE_COST_GROWTH = 1.5
const UPGRADE_SCALING_FACTOR = 1.15

export function upgradeCost(purchaseCount: number): number {
  return Math.round(BASE_UPGRADE_COST * UPGRADE_COST_GROWTH ** purchaseCount)
}

export function upgradeStats(stats: CombatantStats): CombatantStats {
  return {
    attackSpeed: stats.attackSpeed,
    damage: stats.damage * UPGRADE_SCALING_FACTOR,
    hp: stats.hp * UPGRADE_SCALING_FACTOR,
  }
}

export function upgradeReward(value: number): number {
  return value * UPGRADE_SCALING_FACTOR
}
