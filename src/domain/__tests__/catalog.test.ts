import { describe, it, expect } from 'vitest'
import { ENEMY_CATALOG, findEnemyType, createBracketCombatant } from '../catalog'

describe('catalog', () => {
  it('gives every Enemy type a unique id', () => {
    const ids = ENEMY_CATALOG.map((type) => type.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('finds a type by id and reports an unknown id as undefined', () => {
    expect(findEnemyType('grunt')?.name).toBe('Grunt')
    expect(findEnemyType('nope')).toBeUndefined()
  })

  describe('createBracketCombatant', () => {
    it('copies the type stats, baseline trait and reward values', () => {
      const type = findEnemyType('brute')!

      expect(createBracketCombatant(type)).toEqual({
        baseStats: type.baseStats,
        traits: [type.trait],
        experienceValue: type.experienceValue,
        goldValue: type.goldValue,
      })
    })

    it('returns an independent instance so one slot cannot mutate the catalog or another slot', () => {
      const type = findEnemyType('grunt')!
      const first = createBracketCombatant(type)
      const second = createBracketCombatant(type)

      first.traits[0]!.amount = 99
      first.baseStats.hp = 1

      expect(second.traits[0]!.amount).toBe(type.trait.amount)
      expect(second.baseStats.hp).toBe(type.baseStats.hp)
      expect(type.trait.amount).toBe(2)
    })
  })
})
