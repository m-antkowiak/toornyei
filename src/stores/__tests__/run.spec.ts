import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRunStore } from '../run'

describe('run store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves a champion win when the champion out-damages the enemy', () => {
    const store = useRunStore()
    store.champion.baseStats.damage = 20
    store.currentEnemy.baseStats.damage = 5
    store.currentEnemy.baseStats.hp = 40

    store.commitToFight()
    vi.advanceTimersByTime(3000)

    expect(store.outcome).toBe('champion')
    expect(store.isFighting).toBe(false)
  })

  it('resolves a champion loss when the enemy out-damages the champion', () => {
    const store = useRunStore()
    store.champion.baseStats.damage = 5
    store.champion.baseStats.hp = 40
    store.currentEnemy.baseStats.damage = 20

    store.commitToFight()
    vi.advanceTimersByTime(3000)

    expect(store.outcome).toBe('enemy')
    expect(store.isFighting).toBe(false)
  })

  it('depletes HP per tick at the combatants attack cadence', () => {
    const store = useRunStore()
    store.champion.baseStats.attackSpeed = 1
    store.champion.baseStats.damage = 10
    store.currentEnemy.baseStats.hp = 100
    store.currentEnemy.baseStats.damage = 0

    store.commitToFight()
    expect(store.enemyHp).toBe(100)

    vi.advanceTimersByTime(1000)
    expect(store.enemyHp).toBe(90)

    vi.advanceTimersByTime(1000)
    expect(store.enemyHp).toBe(80)
  })

  it('stops ticking once the fight resolves', () => {
    const store = useRunStore()
    store.champion.baseStats.damage = 1000

    store.commitToFight()
    vi.advanceTimersByTime(1000)
    expect(store.outcome).toBe('champion')
    const enemyHpAfterWin = store.enemyHp

    vi.advanceTimersByTime(5000)
    expect(store.enemyHp).toBe(enemyHpAfterWin)
  })

  describe('ladder progression', () => {
    it('advances to the next rung and its enemy on a champion win', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 1000
      const firstEnemy = store.currentEnemy

      expect(store.rungIndex).toBe(0)

      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('champion')
      expect(store.rungIndex).toBe(1)
      expect(store.currentEnemy).not.toBe(firstEnemy)
    })

    it('does not advance the rung on a champion loss', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('enemy')
      expect(store.rungIndex).toBe(0)
    })
  })

  describe('traits', () => {
    it('grants the champion the defeated enemys traits, boosting the next fight', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 1000
      store.champion.baseStats.hp = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(store.outcome).toBe('champion')

      expect(store.champion.traits).toEqual(
        expect.arrayContaining([{ stat: 'damage', amount: 2 }]),
      )
      expect(store.championStats.damage).toBe(1002)
    })

    it('combines same-stat-type traits from consecutive wins by simple addition', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 1000
      store.champion.baseStats.hp = 1000
      store.ladder[1]!.baseStats.hp = 1
      store.ladder[1]!.traits = [{ stat: 'damage', amount: 4 }]

      store.commitToFight()
      vi.advanceTimersByTime(1000)
      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.champion.traits).toEqual([{ stat: 'damage', amount: 6 }])
    })
  })

  describe('run status', () => {
    it('ends the run in defeat on a champion loss and refuses further fights', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('enemy')
      expect(store.runStatus).toBe('defeated')

      const rungBefore = store.rungIndex
      store.commitToFight()
      expect(store.isFighting).toBe(false)
      expect(store.rungIndex).toBe(rungBefore)
    })

    it('ends the run in victory on clearing the final rung', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 1000
      store.champion.baseStats.hp = 1000

      const rungCount = store.ladder.length
      for (let index = 0; index < rungCount; index++) {
        store.commitToFight()
        vi.advanceTimersByTime(1000)
      }

      expect(store.outcome).toBe('champion')
      expect(store.runStatus).toBe('victorious')
    })
  })

  describe('reset', () => {
    it('restores champion stats, traits, ladder position, and run status after a defeat', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(store.runStatus).toBe('defeated')

      store.reset()

      expect(store.runStatus).toBe('active')
      expect(store.rungIndex).toBe(0)
      expect(store.champion.traits).toEqual([])
      expect(store.champion.baseStats).toEqual({ attackSpeed: 1, damage: 10, hp: 100 })
      expect(store.outcome).toBeUndefined()
    })

    it('does nothing while the run is still active', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 999

      store.reset()

      expect(store.champion.baseStats.damage).toBe(999)
    })

    it('allows committing to a fresh fight after a reset', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)
      store.reset()

      store.champion.baseStats.damage = 1000
      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('champion')
    })
  })
})
