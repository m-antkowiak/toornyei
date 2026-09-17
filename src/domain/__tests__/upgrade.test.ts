import { describe, it, expect } from 'vitest'
import { upgradeCost, upgradeStats, upgradeReward } from '../upgrade'

describe('upgrade', () => {
  describe('upgradeCost', () => {
    it('returns the base cost for a first purchase', () => {
      expect(upgradeCost(0)).toBe(20)
    })

    it('grows the cost with each prior purchase', () => {
      expect(upgradeCost(1)).toBe(30)
      expect(upgradeCost(2)).toBe(45)
    })
  })

  describe('upgradeStats', () => {
    it('raises damage and hp, leaving attack speed untouched', () => {
      const result = upgradeStats({ attackSpeed: 1, damage: 10, hp: 100 })
      expect(result.attackSpeed).toBe(1)
      expect(result.damage).toBeCloseTo(11.5)
      expect(result.hp).toBeCloseTo(115)
    })
  })

  describe('upgradeReward', () => {
    it('raises a reward value by the same scaling factor', () => {
      expect(upgradeReward(10)).toBe(11.5)
    })
  })
})
