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
    store.champion.damage = 20
    store.currentEnemy.damage = 5
    store.currentEnemy.hp = 40

    store.commitToFight()
    vi.advanceTimersByTime(3000)

    expect(store.outcome).toBe('champion')
    expect(store.isFighting).toBe(false)
  })

  it('resolves a champion loss when the enemy out-damages the champion', () => {
    const store = useRunStore()
    store.champion.damage = 5
    store.champion.hp = 40
    store.currentEnemy.damage = 20

    store.commitToFight()
    vi.advanceTimersByTime(3000)

    expect(store.outcome).toBe('enemy')
    expect(store.isFighting).toBe(false)
  })

  it('depletes HP per tick at the combatants attack cadence', () => {
    const store = useRunStore()
    store.champion.attackSpeed = 1
    store.champion.damage = 10
    store.currentEnemy.hp = 100
    store.currentEnemy.damage = 0

    store.commitToFight()
    expect(store.enemyHp).toBe(100)

    vi.advanceTimersByTime(1000)
    expect(store.enemyHp).toBe(90)

    vi.advanceTimersByTime(1000)
    expect(store.enemyHp).toBe(80)
  })

  it('stops ticking once the fight resolves', () => {
    const store = useRunStore()
    store.champion.damage = 1000

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
      store.champion.damage = 1000
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
      store.champion.damage = 5
      store.champion.hp = 10
      store.currentEnemy.damage = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('enemy')
      expect(store.rungIndex).toBe(0)
    })

    it('allows re-committing to the same enemy after a loss', () => {
      const store = useRunStore()
      store.champion.damage = 5
      store.champion.hp = 10
      store.currentEnemy.damage = 1000
      const enemyBeforeLoss = store.currentEnemy

      store.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(store.outcome).toBe('enemy')
      expect(store.currentEnemy).toBe(enemyBeforeLoss)

      store.champion.hp = 1000
      store.champion.damage = 1000
      store.currentEnemy.damage = 1
      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('champion')
      expect(store.rungIndex).toBe(1)
    })
  })
})
