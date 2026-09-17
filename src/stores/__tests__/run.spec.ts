import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRunStore } from '../run'
import { useProgressionStore } from '../progression'
import { applyTraits } from '@/domain/trait'
import { experienceReward } from '@/domain/experience'

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

  describe('attack progress', () => {
    it('is zero for both combatants right after committing to a fight', () => {
      const store = useRunStore()
      store.champion.baseStats.attackSpeed = 1
      store.currentEnemy.baseStats.attackSpeed = 1

      store.commitToFight()

      expect(store.championAttackProgress).toBe(0)
      expect(store.enemyAttackProgress).toBe(0)
    })

    it('fills toward 1 over the attack interval and resets after an attack lands', () => {
      const store = useRunStore()
      store.champion.baseStats.attackSpeed = 1
      store.champion.baseStats.hp = 1000
      store.currentEnemy.baseStats.attackSpeed = 1
      store.currentEnemy.baseStats.hp = 1000
      store.currentEnemy.baseStats.damage = 0

      store.commitToFight()
      vi.advanceTimersByTime(500)

      expect(store.championAttackProgress).toBeCloseTo(0.5, 1)

      vi.advanceTimersByTime(500)

      expect(store.championAttackProgress).toBeCloseTo(0, 1)
    })

    it('is zero when no fight is in progress', () => {
      const store = useRunStore()

      expect(store.championAttackProgress).toBe(0)
      expect(store.enemyAttackProgress).toBe(0)
    })
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
      store.ladder[1]!.baseStats.hp = 900
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

  describe('ecosystem', () => {
    it('ticks enemies not engaged by the champion against each other, transferring the loser\'s traits to the winner', () => {
      const store = useRunStore()
      store.ladder[1]!.baseStats.damage = 1000

      vi.advanceTimersByTime(1000)

      expect(store.ladder[1]!.traits).toEqual(
        expect.arrayContaining([
          { stat: 'attackSpeed', amount: 0.1 },
          { stat: 'hp', amount: 20 },
        ]),
      )
      expect(store.ladder[2]!.traits).toEqual([])

      const winnerStats = applyTraits(store.ladder[1]!.baseStats, store.ladder[1]!.traits)
      expect(winnerStats.hp).toBe(store.ladder[1]!.baseStats.hp + 20)
    })

    it('merges experience the same way it merges traits when one enemy defeats another', () => {
      const store = useRunStore()
      store.ladder[1]!.baseStats.damage = 1000
      const winnerXpBefore = store.ladder[1]!.experienceValue
      const loserXp = store.ladder[2]!.experienceValue

      vi.advanceTimersByTime(1000)

      expect(store.ladder[1]!.experienceValue).toBe(winnerXpBefore + loserXp)
      expect(store.ladder[2]!.experienceValue).toBe(0)
    })

    it('does not tick the enemy currently engaged by the champion', () => {
      const store = useRunStore()
      const baselineTraits = [...store.ladder[0]!.traits]

      vi.advanceTimersByTime(60_000)

      expect(store.ladder[0]!.traits).toEqual(baselineTraits)
    })

    it('stops ticking once the run has concluded', () => {
      const store = useRunStore()
      store.champion.baseStats.damage = 1000
      store.champion.baseStats.hp = 1000

      for (let index = 0; index < store.ladder.length; index++) {
        store.commitToFight()
        vi.advanceTimersByTime(1000)
      }
      expect(store.runStatus).toBe('victorious')

      const traitsAfterVictory = [...store.ladder[4]!.traits]
      vi.advanceTimersByTime(60_000)

      expect(store.ladder[4]!.traits).toEqual(traitsAfterVictory)
    })

    it('wipes ecosystem-earned traits on reset', () => {
      const store = useRunStore()
      store.ladder[1]!.baseStats.damage = 1000
      vi.advanceTimersByTime(1000)
      expect(store.ladder[1]!.traits.length).toBeGreaterThan(1)

      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000
      store.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(store.runStatus).toBe('defeated')

      store.reset()

      expect(store.ladder[1]!.traits).toEqual([{ stat: 'attackSpeed', amount: 0.1 }])
    })

    it('wipes ecosystem-earned experience on reset', () => {
      const store = useRunStore()
      const baseXp = store.ladder[1]!.experienceValue
      store.ladder[1]!.baseStats.damage = 1000
      vi.advanceTimersByTime(1000)
      expect(store.ladder[1]!.experienceValue).toBeGreaterThan(baseXp)

      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000
      store.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(store.runStatus).toBe('defeated')

      store.reset()

      expect(store.ladder[1]!.experienceValue).toBe(baseXp)
    })
  })

  describe('progression', () => {
    it('grants experience scaled by the defeated enemys value and the rung reached, on a champion win', () => {
      const store = useRunStore()
      const progression = useProgressionStore()
      store.champion.baseStats.damage = 1000
      const expectedReward = experienceReward(store.currentEnemy.experienceValue, store.rungIndex)

      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('champion')
      expect(progression.experience).toBe(expectedReward)
    })

    it('grants no experience on a champion loss', () => {
      const store = useRunStore()
      const progression = useProgressionStore()
      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('enemy')
      expect(progression.experience).toBe(0)
    })

    it('keeps experience already banked from earlier wins after a later loss ends the run', () => {
      const store = useRunStore()
      const progression = useProgressionStore()
      store.champion.baseStats.damage = 1000
      store.champion.baseStats.hp = 1000

      store.commitToFight()
      vi.advanceTimersByTime(1000)
      const bankedAfterWin = progression.experience
      expect(bankedAfterWin).toBeGreaterThan(0)

      store.champion.baseStats.damage = 5
      store.champion.baseStats.hp = 10
      store.currentEnemy.baseStats.damage = 1000
      store.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(store.outcome).toBe('enemy')
      expect(progression.experience).toBe(bankedAfterWin)
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
      expect(store.champion.baseStats).toEqual({ attackSpeed: 1, damage: 20, hp: 200 })
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
