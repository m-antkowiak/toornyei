import type { CombatantStats } from './fight'
import type { Trait } from './trait'

export interface LadderSeedEntry {
  baseStats: CombatantStats
  traits: Trait[]
  experienceValue: number
  goldValue: number
}

export const LADDER_SEED: LadderSeedEntry[] = [
  {
    baseStats: { attackSpeed: 1, damage: 8, hp: 100 },
    traits: [{ stat: 'damage', amount: 2 }],
    experienceValue: 10,
    goldValue: 15,
  },
  {
    baseStats: { attackSpeed: 1.1, damage: 10, hp: 120 },
    traits: [{ stat: 'attackSpeed', amount: 0.1 }],
    experienceValue: 12,
    goldValue: 18,
  },
  {
    baseStats: { attackSpeed: 1.2, damage: 13, hp: 150 },
    traits: [{ stat: 'hp', amount: 20 }],
    experienceValue: 15,
    goldValue: 22,
  },
  {
    baseStats: { attackSpeed: 1.3, damage: 16, hp: 190 },
    traits: [{ stat: 'damage', amount: 4 }],
    experienceValue: 18,
    goldValue: 28,
  },
  {
    baseStats: { attackSpeed: 1.4, damage: 20, hp: 240 },
    traits: [{ stat: 'attackSpeed', amount: 0.2 }],
    experienceValue: 22,
    goldValue: 35,
  },
]
