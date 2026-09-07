import { describe, it, expect } from 'vitest'
import { mergeTraitSets, applyTraits } from '../trait'

describe('trait', () => {
  describe('mergeTraitSets', () => {
    it('keeps traits of different stat types separate', () => {
      const merged = mergeTraitSets([{ stat: 'damage', amount: 2 }], [{ stat: 'hp', amount: 20 }])

      expect(merged).toEqual(
        expect.arrayContaining([
          { stat: 'damage', amount: 2 },
          { stat: 'hp', amount: 20 },
        ]),
      )
      expect(merged).toHaveLength(2)
    })

    it('combines traits of the same stat type by simple addition', () => {
      const merged = mergeTraitSets(
        [{ stat: 'damage', amount: 2 }],
        [{ stat: 'damage', amount: 3 }],
      )

      expect(merged).toEqual([{ stat: 'damage', amount: 5 }])
    })
  })

  describe('applyTraits', () => {
    it('adds each traits amount to the matching base stat', () => {
      const stats = applyTraits(
        { attackSpeed: 1, damage: 10, hp: 100 },
        [
          { stat: 'damage', amount: 5 },
          { stat: 'hp', amount: 20 },
        ],
      )

      expect(stats).toEqual({ attackSpeed: 1, damage: 15, hp: 120 })
    })

    it('leaves stats untouched when there are no traits', () => {
      const base = { attackSpeed: 1, damage: 10, hp: 100 }
      expect(applyTraits(base, [])).toEqual(base)
    })
  })
})
