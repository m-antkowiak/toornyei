import type { BracketCombatant } from './ecosystem'
import type { CombatantStats } from './fight'
import type { Trait } from './trait'

export interface EnemyType {
  id: string
  name: string
  baseStats: CombatantStats
  trait: Trait
  experienceValue: number
  goldValue: number
}

export const ENEMY_CATALOG: readonly EnemyType[] = [
  {
    id: 'grunt',
    name: 'Grunt',
    baseStats: { attackSpeed: 1, damage: 8, hp: 100 },
    trait: { stat: 'damage', amount: 2 },
    experienceValue: 10,
    goldValue: 15,
  },
  {
    id: 'scout',
    name: 'Scout',
    baseStats: { attackSpeed: 1.1, damage: 10, hp: 120 },
    trait: { stat: 'attackSpeed', amount: 0.1 },
    experienceValue: 12,
    goldValue: 18,
  },
  {
    id: 'brute',
    name: 'Brute',
    baseStats: { attackSpeed: 1.2, damage: 13, hp: 150 },
    trait: { stat: 'hp', amount: 20 },
    experienceValue: 15,
    goldValue: 22,
  },
  {
    id: 'warden',
    name: 'Warden',
    baseStats: { attackSpeed: 1.3, damage: 16, hp: 190 },
    trait: { stat: 'damage', amount: 4 },
    experienceValue: 18,
    goldValue: 28,
  },
  {
    id: 'raider',
    name: 'Raider',
    baseStats: { attackSpeed: 1.4, damage: 20, hp: 240 },
    trait: { stat: 'attackSpeed', amount: 0.2 },
    experienceValue: 22,
    goldValue: 35,
  },
]

export function findEnemyType(id: string): EnemyType | undefined {
  return ENEMY_CATALOG.find((type) => type.id === id)
}

export function createBracketCombatant(type: EnemyType): BracketCombatant {
  return {
    baseStats: { ...type.baseStats },
    traits: [{ ...type.trait }],
    experienceValue: type.experienceValue,
    goldValue: type.goldValue,
  }
}
