import { describe, it, expect } from 'vitest'
import { mergeGold, goldReward } from '../gold'

describe('gold', () => {
  describe('mergeGold', () => {
    it('adds the losers value to the winners', () => {
      expect(mergeGold(10, 5)).toBe(15)
    })

    it('leaves the winners value untouched when the loser had none', () => {
      expect(mergeGold(10, 0)).toBe(10)
    })
  })

  describe('goldReward', () => {
    it('returns the enemys stored value unscaled at level zero', () => {
      expect(goldReward(10, 0)).toBe(10)
    })

    it('scales the reward up with the level reached', () => {
      expect(goldReward(10, 2)).toBe(30)
    })
  })
})
