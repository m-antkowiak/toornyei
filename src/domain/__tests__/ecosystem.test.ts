import { describe, it, expect } from 'vitest'
import {
  pairUpcomingCombatants,
  createBracket,
  liveMatches,
  resolveMatch,
  roundSurvivors,
  type BracketCombatant,
} from '../ecosystem'

function combatant(overrides: Partial<BracketCombatant> = {}): BracketCombatant {
  return {
    baseStats: { attackSpeed: 1, damage: 10, hp: 100 },
    traits: [],
    experienceValue: 0,
    goldValue: 0,
    ...overrides,
  }
}

function combatants(count: number): BracketCombatant[] {
  return Array.from({ length: count }, () => combatant())
}

describe('bracket', () => {
  describe('createBracket', () => {
    it('rejects a combatant count that is not a power of two', () => {
      expect(() => createBracket(combatants(3))).toThrow()
      expect(() => createBracket(combatants(0))).toThrow()
      expect(() => createBracket(combatants(1))).toThrow()
    })

    it('starts with every slot in the first round and nobody advanced', () => {
      const bracket = createBracket(combatants(16))

      expect(roundSurvivors(bracket, 0)).toHaveLength(16)
      expect(roundSurvivors(bracket, 1)).toEqual([])
      expect(roundSurvivors(bracket, 4)).toEqual([])
    })
  })

  describe('liveMatches', () => {
    it('pairs adjacent slots of the first round', () => {
      const bracket = createBracket(combatants(4))

      expect(liveMatches(bracket)).toEqual([
        { round: 0, index: 0, first: 0, second: 1 },
        { round: 0, index: 1, first: 2, second: 3 },
      ])
    })

    it('yields eight first-round matches for a sixteen-slot bracket', () => {
      expect(liveMatches(createBracket(combatants(16)))).toHaveLength(8)
    })

    it('makes a later-round match live only once both feeder matches are resolved', () => {
      const bracket = createBracket(combatants(4))

      resolveMatch(bracket, 0, 0, 'champion')
      expect(liveMatches(bracket)).toEqual([{ round: 0, index: 1, first: 2, second: 3 }])

      resolveMatch(bracket, 0, 1, 'enemy')
      expect(liveMatches(bracket)).toEqual([{ round: 1, index: 0, first: 0, second: 3 }])
    })

    it('is empty once the final is resolved', () => {
      const bracket = createBracket(combatants(2))

      resolveMatch(bracket, 0, 0, 'champion')

      expect(liveMatches(bracket)).toEqual([])
    })
  })

  describe('resolveMatch', () => {
    it('advances the first entrant when the outcome is champion', () => {
      const bracket = createBracket(combatants(4))

      resolveMatch(bracket, 0, 0, 'champion')

      expect(roundSurvivors(bracket, 1)).toEqual([0])
    })

    it('advances the second entrant when the outcome is enemy', () => {
      const bracket = createBracket(combatants(4))

      resolveMatch(bracket, 0, 0, 'enemy')

      expect(roundSurvivors(bracket, 1)).toEqual([1])
    })

    it('gives the winner the loser traits, combining same-stat traits by addition', () => {
      const slots = [
        combatant({ traits: [{ stat: 'damage', amount: 2 }] }),
        combatant({
          traits: [
            { stat: 'damage', amount: 3 },
            { stat: 'hp', amount: 20 },
          ],
        }),
      ]
      const bracket = createBracket(slots)

      resolveMatch(bracket, 0, 0, 'champion')

      expect(slots[0]!.traits).toEqual([
        { stat: 'damage', amount: 5 },
        { stat: 'hp', amount: 20 },
      ])
    })

    it('sums experience and gold into the winner', () => {
      const slots = [
        combatant({ experienceValue: 10, goldValue: 15 }),
        combatant({ experienceValue: 12, goldValue: 18 }),
      ]
      const bracket = createBracket(slots)

      resolveMatch(bracket, 0, 0, 'champion')

      expect(slots[0]!.experienceValue).toBe(22)
      expect(slots[0]!.goldValue).toBe(33)
    })

    it('strips the loser of traits, experience and gold', () => {
      const slots = [
        combatant({ traits: [{ stat: 'hp', amount: 20 }], experienceValue: 10, goldValue: 15 }),
        combatant({ traits: [{ stat: 'damage', amount: 3 }], experienceValue: 12, goldValue: 18 }),
      ]
      const bracket = createBracket(slots)

      resolveMatch(bracket, 0, 0, 'champion')

      expect(slots[1]!.traits).toEqual([])
      expect(slots[1]!.experienceValue).toBe(0)
      expect(slots[1]!.goldValue).toBe(0)
    })

    it('returns true when it resolves a live match', () => {
      const bracket = createBracket(combatants(4))

      expect(resolveMatch(bracket, 0, 0, 'champion')).toBe(true)
    })

    it('refuses a match that is already resolved', () => {
      const slots = [
        combatant({ experienceValue: 10 }),
        combatant({ experienceValue: 12 }),
        combatant(),
        combatant(),
      ]
      const bracket = createBracket(slots)
      resolveMatch(bracket, 0, 0, 'champion')

      expect(resolveMatch(bracket, 0, 0, 'enemy')).toBe(false)
      expect(roundSurvivors(bracket, 1)).toEqual([0])
      expect(slots[0]!.experienceValue).toBe(22)
    })

    it('refuses a match whose entrants are not both known yet', () => {
      const bracket = createBracket(combatants(4))

      expect(resolveMatch(bracket, 1, 0, 'champion')).toBe(false)
    })

    it('refuses a match that does not exist', () => {
      const bracket = createBracket(combatants(4))

      expect(resolveMatch(bracket, 0, 5, 'champion')).toBe(false)
      expect(resolveMatch(bracket, 9, 0, 'champion')).toBe(false)
    })
  })

  describe('roundSurvivors', () => {
    it('lists the slots that have reached a round, in bracket order', () => {
      const bracket = createBracket(combatants(4))

      resolveMatch(bracket, 0, 1, 'enemy')
      expect(roundSurvivors(bracket, 1)).toEqual([3])

      resolveMatch(bracket, 0, 0, 'champion')
      expect(roundSurvivors(bracket, 1)).toEqual([0, 3])
    })

    it('carries the cumulative traits of a bracket-long winner to the final survivor', () => {
      const slots = [
        combatant({ traits: [{ stat: 'damage', amount: 1 }] }),
        combatant({ traits: [{ stat: 'damage', amount: 2 }] }),
        combatant({ traits: [{ stat: 'damage', amount: 4 }] }),
        combatant({ traits: [{ stat: 'damage', amount: 8 }] }),
      ]
      const bracket = createBracket(slots)

      resolveMatch(bracket, 0, 0, 'enemy')
      resolveMatch(bracket, 0, 1, 'enemy')
      resolveMatch(bracket, 1, 0, 'champion')

      expect(roundSurvivors(bracket, 2)).toEqual([1])
      expect(slots[1]!.traits).toEqual([{ stat: 'damage', amount: 15 }])
    })

    it('is empty for a round that does not exist', () => {
      expect(roundSurvivors(createBracket(combatants(4)), 7)).toEqual([])
    })
  })
})

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
