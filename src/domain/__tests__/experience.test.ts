import { describe, it, expect } from 'vitest'
import { mergeExperience, experienceReward } from '../experience'

describe('experience', () => {
  describe('mergeExperience', () => {
    it('adds the losers value to the winners', () => {
      expect(mergeExperience(10, 5)).toBe(15)
    })

    it('leaves the winners value untouched when the loser had none', () => {
      expect(mergeExperience(10, 0)).toBe(10)
    })
  })

  describe('experienceReward', () => {
    it('returns the enemys stored value unscaled at level zero', () => {
      expect(experienceReward(10, 0)).toBe(10)
    })

    it('scales the reward up with the level reached', () => {
      expect(experienceReward(10, 2)).toBe(30)
    })
  })
})
