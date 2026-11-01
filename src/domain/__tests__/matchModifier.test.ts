import { describe, it, expect } from 'vitest'
import {
  MATCH_MODIFIER_CATALOG,
  MODIFIER_OFFER_SIZE,
  drawModifierOffer,
  findMatchModifier,
  isMatchPositionInBracket,
  modifyCombatStats,
  rewardScale,
  type ModifierEffect,
} from '../matchModifier'

const STATS = { attackSpeed: 1, damage: 10, hp: 100, regen: 0 }

function effect(
  parameter: ModifierEffect['parameter'],
  multiplier: number,
  target: ModifierEffect['target'],
): ModifierEffect {
  return { parameter, multiplier, target }
}

describe('matchModifier', () => {
  describe('modifyCombatStats', () => {
    it('scales both combatants for a both-targeted effect', () => {
      const effects = [effect('damage', 1.5, 'both')]
      expect(modifyCombatStats(STATS, effects, true).damage).toBe(15)
      expect(modifyCombatStats(STATS, effects, false).damage).toBe(15)
    })

    it('scales only enemies for an enemies-targeted effect', () => {
      const effects = [effect('hp', 2, 'enemies')]
      expect(modifyCombatStats(STATS, effects, true).hp).toBe(100)
      expect(modifyCombatStats(STATS, effects, false).hp).toBe(200)
    })

    it('scales only the champion for a champion-targeted effect', () => {
      const effects = [effect('attackSpeed', 2, 'champion')]
      expect(modifyCombatStats(STATS, effects, true).attackSpeed).toBe(2)
      expect(modifyCombatStats(STATS, effects, false).attackSpeed).toBe(1)
    })

    it('leaves stats alone for reward parameters', () => {
      expect(modifyCombatStats(STATS, [effect('goldValue', 3, 'both')], false)).toEqual(STATS)
    })
  })

  describe('rewardScale', () => {
    it('is 1 when no effect touches the parameter', () => {
      expect(rewardScale([effect('damage', 2, 'both')], 'goldValue', false)).toBe(1)
    })

    it('multiplies matching effects whose target covers the loser', () => {
      const effects = [
        effect('experienceValue', 2, 'enemies'),
        effect('experienceValue', 3, 'both'),
      ]
      expect(rewardScale(effects, 'experienceValue', false)).toBe(6)
      expect(rewardScale(effects, 'experienceValue', true)).toBe(3)
    })
  })

  describe('isMatchPositionInBracket', () => {
    it('accepts every match of a two-level bracket and nothing else', () => {
      expect(isMatchPositionInBracket(2, { round: 0, index: 0 })).toBe(true)
      expect(isMatchPositionInBracket(2, { round: 0, index: 1 })).toBe(true)
      expect(isMatchPositionInBracket(2, { round: 1, index: 0 })).toBe(true)
      expect(isMatchPositionInBracket(2, { round: 1, index: 1 })).toBe(false)
      expect(isMatchPositionInBracket(2, { round: 2, index: 0 })).toBe(false)
      expect(isMatchPositionInBracket(2, { round: 0, index: -1 })).toBe(false)
    })
  })

  describe('drawModifierOffer', () => {
    it('offers distinct catalog modifiers', () => {
      const offer = drawModifierOffer()
      expect(offer).toHaveLength(MODIFIER_OFFER_SIZE)
      expect(new Set(offer.map((modifier) => modifier.id)).size).toBe(MODIFIER_OFFER_SIZE)
      for (const modifier of offer) expect(findMatchModifier(modifier.id)).toBe(modifier)
    })

    it('is driven by the injected random source', () => {
      const first = drawModifierOffer(() => 0).map((modifier) => modifier.id)
      expect(first).toEqual(MATCH_MODIFIER_CATALOG.slice(0, MODIFIER_OFFER_SIZE).map((m) => m.id))
    })
  })
})
