import type { CombatantStats } from './fight'

export type TraitStat = keyof CombatantStats

export interface Trait {
  stat: TraitStat
  amount: number
}

export function mergeTraitSets(a: readonly Trait[], b: readonly Trait[]): Trait[] {
  const amountByStat = new Map<TraitStat, number>()
  for (const trait of [...a, ...b]) {
    amountByStat.set(trait.stat, (amountByStat.get(trait.stat) ?? 0) + trait.amount)
  }
  return Array.from(amountByStat, ([stat, amount]) => ({ stat, amount }))
}

export function applyTraits(base: CombatantStats, traits: readonly Trait[]): CombatantStats {
  const result = { ...base }
  for (const trait of traits) {
    result[trait.stat] += trait.amount
  }
  return result
}
