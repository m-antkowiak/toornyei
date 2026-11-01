import type { CombatantStats } from './fight'
import { formatNumber } from './format'

export type ModifierParameter =
  | 'attackSpeed'
  | 'damage'
  | 'hp'
  | 'traitAmount'
  | 'experienceValue'
  | 'goldValue'

export type RewardParameter = 'traitAmount' | 'experienceValue' | 'goldValue'

export type ModifierTarget = 'both' | 'champion' | 'enemies'

export interface ModifierEffect {
  parameter: ModifierParameter
  multiplier: number
  target: ModifierTarget
}

export interface MatchModifier {
  id: string
  name: string
  effects: ModifierEffect[]
}

export interface MatchPosition {
  round: number
  index: number
}

export const MATCH_MODIFIER_CATALOG: readonly MatchModifier[] = [
  {
    id: 'glass-cannon',
    name: 'Glass Cannon',
    effects: [{ parameter: 'damage', multiplier: 1.5, target: 'both' }],
  },
  {
    id: 'thick-skins',
    name: 'Thick Skins',
    effects: [{ parameter: 'hp', multiplier: 1.5, target: 'both' }],
  },
  {
    id: 'frenzy',
    name: 'Frenzy',
    effects: [{ parameter: 'attackSpeed', multiplier: 1.3, target: 'both' }],
  },
  {
    id: 'feast',
    name: 'Feast',
    effects: [{ parameter: 'experienceValue', multiplier: 2, target: 'enemies' }],
  },
  {
    id: 'bounty',
    name: 'Bounty',
    effects: [{ parameter: 'goldValue', multiplier: 2, target: 'enemies' }],
  },
  {
    id: 'potent-blood',
    name: 'Potent Blood',
    effects: [{ parameter: 'traitAmount', multiplier: 2, target: 'enemies' }],
  },
]

export const MODIFIER_OFFER_SIZE = 3

export function findMatchModifier(id: string): MatchModifier | undefined {
  return MATCH_MODIFIER_CATALOG.find((modifier) => modifier.id === id)
}

export function isSameMatchPosition(first: MatchPosition, second: MatchPosition): boolean {
  return first.round === second.round && first.index === second.index
}

export function isMatchPositionInBracket(levels: number, position: MatchPosition): boolean {
  if (!Number.isSafeInteger(position.round) || !Number.isSafeInteger(position.index)) return false
  if (position.round < 0 || position.round >= levels) return false
  return position.index >= 0 && position.index < 2 ** (levels - 1 - position.round)
}

function isEffectOnCombatant(effect: ModifierEffect, isChampion: boolean): boolean {
  if (effect.target === 'both') return true
  return effect.target === 'champion' ? isChampion : !isChampion
}

const COMBAT_PARAMETERS = new Set<ModifierParameter>(['attackSpeed', 'damage', 'hp'])

function isCombatParameter(
  parameter: ModifierParameter,
): parameter is 'attackSpeed' | 'damage' | 'hp' {
  return COMBAT_PARAMETERS.has(parameter)
}

export function modifyCombatStats(
  stats: CombatantStats,
  effects: readonly ModifierEffect[],
  isChampion: boolean,
): CombatantStats {
  const result = { ...stats }
  for (const effect of effects) {
    if (!isEffectOnCombatant(effect, isChampion)) continue
    if (isCombatParameter(effect.parameter)) result[effect.parameter] *= effect.multiplier
  }
  return result
}

export function rewardScale(
  effects: readonly ModifierEffect[],
  parameter: RewardParameter,
  isLoserChampion: boolean,
): number {
  let scale = 1
  for (const effect of effects) {
    if (effect.parameter === parameter && isEffectOnCombatant(effect, isLoserChampion)) {
      scale *= effect.multiplier
    }
  }
  return scale
}

export function drawModifierOffer(random: () => number = Math.random): MatchModifier[] {
  const pool = [...MATCH_MODIFIER_CATALOG]
  const offer: MatchModifier[] = []
  while (offer.length < MODIFIER_OFFER_SIZE && pool.length > 0) {
    const pick = Math.min(pool.length - 1, Math.floor(random() * pool.length))
    offer.push(pool.splice(pick, 1)[0]!)
  }
  return offer
}

export const MODIFIER_DRAG_MIME = 'application/x-toornyei-modifier'

const PARAMETER_LABELS: Record<ModifierParameter, string> = {
  attackSpeed: 'Attack Speed',
  damage: 'Damage',
  hp: 'HP',
  traitAmount: 'Trait amount',
  experienceValue: 'Experience value',
  goldValue: 'Gold value',
}

const TARGET_LABELS: Record<ModifierTarget, string> = {
  both: 'both',
  champion: 'Champion',
  enemies: 'Enemies',
}

export function describeEffect(effect: ModifierEffect): string {
  return [
    PARAMETER_LABELS[effect.parameter],
    ' ×',
    formatNumber(effect.multiplier, 2),
    ' (',
    TARGET_LABELS[effect.target],
    ')',
  ].join('')
}
