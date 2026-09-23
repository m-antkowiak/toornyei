import { describe, it, expect } from 'vitest'
import { ladderLevelStats } from '../ladderLevel'

describe('ladderLevel', () => {
  describe('ladderLevelStats', () => {
    it('leaves stats untouched at level zero', () => {
      expect(ladderLevelStats({ attackSpeed: 1, damage: 10, hp: 100 }, 0)).toEqual({
        attackSpeed: 1,
        damage: 10,
        hp: 100,
      })
    })

    it('raises damage and hp by 15% for one level, leaving attack speed untouched', () => {
      const result = ladderLevelStats({ attackSpeed: 1, damage: 10, hp: 100 }, 1)
      expect(result.attackSpeed).toBe(1)
      expect(result.damage).toBeCloseTo(11.5)
      expect(result.hp).toBeCloseTo(115)
    })

    it('compounds the multiplier across levels', () => {
      const result = ladderLevelStats({ attackSpeed: 1, damage: 10, hp: 100 }, 2)
      expect(result.damage).toBeCloseTo(13.225)
      expect(result.hp).toBeCloseTo(132.25)
    })
  })
})
