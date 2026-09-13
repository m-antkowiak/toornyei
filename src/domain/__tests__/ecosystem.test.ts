import { describe, it, expect } from 'vitest'
import { pairUpcomingCombatants } from '../ecosystem'

describe('ecosystem', () => {
  describe('pairUpcomingCombatants', () => {
    it('pairs up adjacent combatants ahead of the current index', () => {
      expect(pairUpcomingCombatants(5, 0)).toEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('excludes combatants at or behind the current index, not just the current one', () => {
      expect(pairUpcomingCombatants(5, 2)).toEqual([[3, 4]])
    })

    it('leaves a trailing combatant unpaired when the upcoming count is odd', () => {
      expect(pairUpcomingCombatants(4, 0)).toEqual([[1, 2]])
    })

    it('returns no pairs when fewer than two combatants are upcoming', () => {
      expect(pairUpcomingCombatants(1, 0)).toEqual([])
      expect(pairUpcomingCombatants(2, 0)).toEqual([])
      expect(pairUpcomingCombatants(5, 4)).toEqual([])
    })
  })
})
