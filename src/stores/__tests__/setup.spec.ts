import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSetupStore, BRACKET_LEVELS, ENEMY_SLOT_COUNT } from '../setup'
import { ENEMY_CATALOG, findEnemyType } from '@/domain/catalog'

function fillEverySlot(store: ReturnType<typeof useSetupStore>, typeId = 'grunt') {
  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot++) {
    store.didPlaceType(slot, typeId)
  }
}

describe('setup store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with an empty slot for every Enemy but the Champion, and nothing locked', () => {
    const store = useSetupStore()

    expect(BRACKET_LEVELS).toBe(4)
    expect(ENEMY_SLOT_COUNT).toBe(15)
    expect(store.placement).toHaveLength(15)
    expect(store.placement.every((slot) => slot === undefined)).toBe(true)
    expect(store.isLocked).toBe(false)
    expect(store.isComplete).toBe(false)
  })

  describe('placement', () => {
    it('places an Enemy type into a slot', () => {
      const store = useSetupStore()

      expect(store.didPlaceType(3, 'scout')).toBe(true)

      expect(store.placement[3]).toBe('scout')
    })

    it('replaces the type already in a slot', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'grunt')

      store.didPlaceType(0, 'brute')

      expect(store.placement[0]).toBe('brute')
    })

    it('allows the same type in several slots', () => {
      const store = useSetupStore()

      store.didPlaceType(0, 'grunt')
      store.didPlaceType(1, 'grunt')

      expect(store.placement.slice(0, 2)).toEqual(['grunt', 'grunt'])
    })

    it('rejects an unknown type', () => {
      const store = useSetupStore()

      expect(store.didPlaceType(0, 'nope')).toBe(false)
      expect(store.placement[0]).toBeUndefined()
    })

    it('rejects a slot outside the bracket', () => {
      const store = useSetupStore()

      expect(store.didPlaceType(-1, 'grunt')).toBe(false)
      expect(store.didPlaceType(15, 'grunt')).toBe(false)
      expect(store.didPlaceType(1.5, 'grunt')).toBe(false)
      expect(store.placement).toHaveLength(15)
    })

    it('clears a slot', () => {
      const store = useSetupStore()
      store.didPlaceType(2, 'grunt')

      expect(store.didClearSlot(2)).toBe(true)

      expect(store.placement[2]).toBeUndefined()
    })

    it('is complete only once every slot is filled', () => {
      const store = useSetupStore()
      for (let slot = 0; slot < ENEMY_SLOT_COUNT - 1; slot++) store.didPlaceType(slot, 'grunt')
      expect(store.isComplete).toBe(false)

      store.didPlaceType(ENEMY_SLOT_COUNT - 1, 'grunt')

      expect(store.isComplete).toBe(true)
    })
  })

  describe('locking', () => {
    it('blocks placing and clearing while locked, leaving the placement untouched', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'grunt')
      store.lockPlacement()

      expect(store.isLocked).toBe(true)
      expect(store.didPlaceType(0, 'brute')).toBe(false)
      expect(store.didPlaceType(1, 'brute')).toBe(false)
      expect(store.didClearSlot(0)).toBe(false)
      expect(store.placement[0]).toBe('grunt')
      expect(store.placement[1]).toBeUndefined()
    })

    it('allows placement again after unlocking', () => {
      const store = useSetupStore()
      store.lockPlacement()

      store.unlockPlacement()

      expect(store.isLocked).toBe(false)
      expect(store.didPlaceType(0, 'grunt')).toBe(true)
    })
  })

  describe('bracket combatants', () => {
    it('builds nothing while the placement is incomplete', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'grunt')

      expect(store.buildCombatants()).toBeUndefined()
    })

    it('builds one combatant per slot from the placed types, in slot order', () => {
      const store = useSetupStore()
      for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot++) {
        store.didPlaceType(slot, ENEMY_CATALOG[slot % ENEMY_CATALOG.length]!.id)
      }

      const combatants = store.buildCombatants()!

      expect(combatants).toHaveLength(15)
      expect(combatants[1]!.baseStats).toEqual(findEnemyType('scout')!.baseStats)
      expect(combatants[2]!.traits).toEqual([findEnemyType('brute')!.trait])
    })

    it('builds fresh combatants each time so a Run cannot mutate the next one', () => {
      const store = useSetupStore()
      fillEverySlot(store)

      const first = store.buildCombatants()!
      first[0]!.traits = []
      first[0]!.experienceValue = 0

      const second = store.buildCombatants()!
      expect(second[0]!.traits).toEqual([findEnemyType('grunt')!.trait])
      expect(second[0]!.experienceValue).toBe(findEnemyType('grunt')!.experienceValue)
    })
  })

  describe('saved setups', () => {
    it('starts with none', () => {
      expect(useSetupStore().savedSetups).toEqual([])
    })

    it('saves the current placement under a name', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'scout')

      expect(store.didSaveSetup('aggro')).toBe(true)

      expect(store.savedSetups.map((setup) => setup.name)).toEqual(['aggro'])
      expect(store.savedSetups[0]!.placement[0]).toBe('scout')
    })

    it('trims the name and rejects a blank one', () => {
      const store = useSetupStore()

      expect(store.didSaveSetup(' '.repeat(3))).toBe(false)
      expect(store.didSaveSetup('  tidy  ')).toBe(true)

      expect(store.savedSetups.map((setup) => setup.name)).toEqual(['tidy'])
    })

    it('overwrites a setup saved under the same name instead of duplicating it', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'grunt')
      store.didSaveSetup('mine')
      store.didPlaceType(0, 'raider')

      store.didSaveSetup('mine')

      expect(store.savedSetups).toHaveLength(1)
      expect(store.savedSetups[0]!.placement[0]).toBe('raider')
    })

    it('does not follow later edits to the working placement', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'grunt')
      store.didSaveSetup('mine')

      store.didPlaceType(0, 'raider')

      expect(store.savedSetups[0]!.placement[0]).toBe('grunt')
    })

    it('loads a saved setup into the working placement', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'brute')
      store.didSaveSetup('mine')
      store.didClearSlot(0)

      expect(store.didLoadSetup('mine')).toBe(true)

      expect(store.placement[0]).toBe('brute')
    })

    it('copies on load, so editing afterwards leaves the saved setup alone', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'brute')
      store.didSaveSetup('mine')

      store.didLoadSetup('mine')
      store.didPlaceType(0, 'raider')

      expect(store.savedSetups[0]!.placement[0]).toBe('brute')
    })

    it('rejects loading an unknown name and leaves the placement alone', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'grunt')

      expect(store.didLoadSetup('missing')).toBe(false)
      expect(store.placement[0]).toBe('grunt')
    })

    it('rejects loading while locked', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'brute')
      store.didSaveSetup('mine')
      store.didClearSlot(0)
      store.lockPlacement()

      expect(store.didLoadSetup('mine')).toBe(false)
      expect(store.placement[0]).toBeUndefined()
    })

    it('still saves while locked', () => {
      const store = useSetupStore()
      store.didPlaceType(0, 'brute')
      store.lockPlacement()

      expect(store.didSaveSetup('mine')).toBe(true)
    })
  })

  describe('persistence', () => {
    it('keeps saved setups across a reload', () => {
      const first = useSetupStore()
      first.didPlaceType(0, 'warden')
      first.didSaveSetup('mine')

      setActivePinia(createPinia())
      const reloaded = useSetupStore()

      expect(reloaded.savedSetups.map((setup) => setup.name)).toEqual(['mine'])
      expect(reloaded.savedSetups[0]!.placement[0]).toBe('warden')
      expect(reloaded.savedSetups[0]!.placement[1]).toBeUndefined()
      expect(reloaded.didLoadSetup('mine')).toBe(true)
      expect(reloaded.placement[0]).toBe('warden')
    })

    it('does not persist the working placement or the lock', () => {
      const first = useSetupStore()
      first.didPlaceType(0, 'warden')
      first.lockPlacement()

      setActivePinia(createPinia())
      const reloaded = useSetupStore()

      expect(reloaded.placement[0]).toBeUndefined()
      expect(reloaded.isLocked).toBe(false)
    })

    it('starts fresh when the stored data is corrupt', () => {
      localStorage.setItem('toornyei:setups', 'not json')

      expect(useSetupStore().savedSetups).toEqual([])
    })

    it('drops stored setups with the wrong shape and keeps the valid ones', () => {
      const valid = Array.from({ length: ENEMY_SLOT_COUNT }, () => 'grunt')
      localStorage.setItem(
        'toornyei:setups',
        JSON.stringify([
          { name: 'good', placement: valid },
          { name: 'short', placement: ['grunt'] },
          { name: 42, placement: valid },
          undefined,
        ]),
      )

      const store = useSetupStore()

      expect(store.savedSetups.map((setup) => setup.name)).toEqual(['good'])
    })

    it('treats a stored type id that no longer exists as an empty slot', () => {
      const placement = Array.from({ length: ENEMY_SLOT_COUNT }, () => 'grunt')
      placement[4] = 'retired-type'
      localStorage.setItem('toornyei:setups', JSON.stringify([{ name: 'old', placement }]))

      const store = useSetupStore()

      expect(store.savedSetups[0]!.placement[4]).toBeUndefined()
      expect(store.savedSetups[0]!.placement[3]).toBe('grunt')
    })
  })
})
