import type { CombatantStats } from './fight'

export type ChampionUpgradeKind = 'damage' | 'attackSpeed' | 'hp'

export type ChampionUpgradeLevels = Record<ChampionUpgradeKind, number>

export const CHAMPION_UPGRADE_KINDS: ChampionUpgradeKind[] = ['damage', 'attackSpeed', 'hp']

const STEP_PER_LEVEL: Record<ChampionUpgradeKind, number> = {
  damage: 2,
  attackSpeed: 0.05,
  hp: 20,
}

const BASE_COST: Record<ChampionUpgradeKind, number> = {
  damage: 10,
  attackSpeed: 15,
  hp: 10,
}

const COST_GROWTH: Record<ChampionUpgradeKind, number> = {
  damage: 1.35,
  attackSpeed: 1.4,
  hp: 1.3,
}

export function createChampionUpgradeLevels(): ChampionUpgradeLevels {
  return { damage: 0, attackSpeed: 0, hp: 0 }
}

export function championUpgradeCost(kind: ChampionUpgradeKind, level: number): number {
  return Math.round(BASE_COST[kind] * COST_GROWTH[kind] ** level)
}

export function applyChampionUpgrades(
  stats: CombatantStats,
  levels: ChampionUpgradeLevels,
): CombatantStats {
  return {
    attackSpeed: stats.attackSpeed + STEP_PER_LEVEL.attackSpeed * levels.attackSpeed,
    damage: stats.damage + STEP_PER_LEVEL.damage * levels.damage,
    hp: stats.hp + STEP_PER_LEVEL.hp * levels.hp,
  }
}
