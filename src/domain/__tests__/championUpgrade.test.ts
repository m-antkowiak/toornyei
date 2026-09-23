import { describe, it, expect } from 'vitest'
import {
  applyChampionUpgrades,
  championUpgradeCost,
  createChampionUpgradeLevels,
} from '../championUpgrade'

describe('championUpgrade', () => {
  describe('championUpgradeCost', () => {
    it('returns the base cost for the first level of each kind', () => {
      expect(championUpgradeCost('damage', 0)).toBe(10)
      expect(championUpgradeCost('hp', 0)).toBe(10)
      expect(championUpgradeCost('attackSpeed', 0)).toBe(15)
    })

    it('grows the cost with each level already bought', () => {
      expect(championUpgradeCost('damage', 1)).toBeGreaterThan(championUpgradeCost('damage', 0))
      expect(championUpgradeCost('damage', 5)).toBeGreaterThan(championUpgradeCost('damage', 4))
    })
  })

  describe('applyChampionUpgrades', () => {
    it('leaves stats unchanged at level zero', () => {
      const base = { attackSpeed: 1, damage: 20, hp: 200 }
      expect(applyChampionUpgrades(base, createChampionUpgradeLevels())).toEqual(base)
    })

    it('adds a fixed step per level to each stat independently', () => {
      const result = applyChampionUpgrades(
        { attackSpeed: 1, damage: 20, hp: 200 },
        { damage: 2, attackSpeed: 4, hp: 3 },
      )
      expect(result.damage).toBeCloseTo(24)
      expect(result.attackSpeed).toBeCloseTo(1.2)
      expect(result.hp).toBeCloseTo(260)
    })
  })
})
