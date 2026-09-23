import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRunStore } from '../run'
import { useProgressionStore } from '../progression'
import { useSetupStore, ENEMY_SLOT_COUNT } from '../setup'
import { ENEMY_CATALOG, findEnemyType } from '@/domain/catalog'
import { experienceReward } from '@/domain/experience'
import { goldReward } from '@/domain/gold'

const FIGHT_COOLDOWN_MS = 1000
const WHOLE_BRACKET_MS = 60_000

function setupRun(typeId = 'grunt') {
  const run = useRunStore()
  const setup = useSetupStore()
  const progression = useProgressionStore()
  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot++) {
    setup.didPlaceType(slot, typeId)
  }
  return { run, setup, progression }
}

function progressOf(progression: ReturnType<typeof useProgressionStore>, typeId: string) {
  return progression.enemyProgress[ENEMY_CATALOG.findIndex((type) => type.id === typeId)]!
}

function makeChampionUnkillable(run: ReturnType<typeof useRunStore>) {
  run.champion.baseStats.damage = 1000
  run.champion.baseStats.hp = 100_000
}

function setupFastSecondRound() {
  const stores = setupRun()
  stores.setup.didPlaceType(1, 'raider')
  progressOf(stores.progression, 'raider').baseStats.damage = 1000
  makeChampionUnkillable(stores.run)
  return stores
}

function loseFirstFight(stores: ReturnType<typeof setupRun>) {
  stores.run.champion.baseStats.damage = 5
  stores.run.champion.baseStats.hp = 10
  progressOf(stores.progression, 'grunt').baseStats.damage = 1000
  stores.run.commitToFight()
  vi.advanceTimersByTime(1000)
}

function winWholeBracket(stores: ReturnType<typeof setupRun>) {
  makeChampionUnkillable(stores.run)
  stores.run.commitToFight()
  vi.advanceTimersByTime(WHOLE_BRACKET_MS)
}

describe('run store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('committing to a run', () => {
    it('starts in setup with no bracket', () => {
      const run = useRunStore()

      expect(run.runStatus).toBe('setup')
      expect(run.bracket).toBeUndefined()
      expect(run.currentEnemy).toBeUndefined()
      expect(run.isFighting).toBe(false)
    })

    it('refuses to commit while the placement is incomplete', () => {
      const run = useRunStore()
      const setup = useSetupStore()
      setup.didPlaceType(0, 'grunt')

      run.commitToFight()

      expect(run.runStatus).toBe('setup')
      expect(run.bracket).toBeUndefined()
      expect(run.isRunning).toBe(false)
      expect(setup.isLocked).toBe(false)
    })

    it('builds a sixteen-slot bracket with the Champion in the first slot, and locks the placement', () => {
      const { run, setup } = setupRun()

      run.commitToFight()

      expect(run.runStatus).toBe('active')
      expect(run.bracket!.combatants).toHaveLength(16)
      expect(run.bracket!.combatants[0]).toBe(run.champion)
      expect(setup.isLocked).toBe(true)
      expect(setup.didPlaceType(0, 'brute')).toBe(false)
    })

    it('puts the placed Enemy types into the slots after the Champion, in order', () => {
      const { run, setup } = setupRun()
      setup.didPlaceType(0, 'scout')
      setup.didPlaceType(14, 'raider')

      run.commitToFight()

      expect(run.bracket!.combatants[1]!.baseStats).toEqual(findEnemyType('scout')!.baseStats)
      expect(run.bracket!.combatants[15]!.baseStats).toEqual(findEnemyType('raider')!.baseStats)
    })

    it('starts the first fight against the Enemy next to the Champion', () => {
      const { run } = setupRun()

      run.commitToFight()

      expect(run.isFighting).toBe(true)
      expect(run.currentEnemy).toBe(run.bracket!.combatants[1])
      expect(run.roundIndex).toBe(0)
    })

    it('ignores committing again while a run is in progress', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(1000)
      const bracket = run.bracket

      run.commitToFight()

      expect(run.bracket).toBe(bracket)
      expect(run.roundIndex).toBe(1)
    })
  })

  describe('fights', () => {
    it('resolves a champion win when the champion out-damages the enemy', () => {
      const { run } = setupRun()
      run.champion.baseStats.damage = 20

      run.commitToFight()
      vi.advanceTimersByTime(6000)

      expect(run.outcome).toBe('champion')
      expect(run.isFighting).toBe(false)
    })

    it('resolves a champion loss when the enemy out-damages the champion', () => {
      const stores = setupRun()
      stores.run.champion.baseStats.damage = 5
      stores.run.champion.baseStats.hp = 40
      progressOf(stores.progression, 'grunt').baseStats.damage = 20

      stores.run.commitToFight()
      vi.advanceTimersByTime(2500)

      expect(stores.run.outcome).toBe('enemy')
      expect(stores.run.isFighting).toBe(false)
    })

    it('depletes HP per tick at the combatants attack cadence', () => {
      const { run } = setupRun()
      run.champion.baseStats.attackSpeed = 1
      run.champion.baseStats.damage = 10
      run.champion.baseStats.hp = 100_000

      run.commitToFight()
      expect(run.enemyHp).toBe(100)

      vi.advanceTimersByTime(1000)
      expect(run.enemyHp).toBe(90)

      vi.advanceTimersByTime(1000)
      expect(run.enemyHp).toBe(80)
    })

    it('stops advancing the fight once it resolves', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)

      run.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(run.outcome).toBe('champion')
      const enemyHpAfterWin = run.enemyHp

      vi.advanceTimersByTime(500)
      expect(run.enemyHp).toBe(enemyHpAfterWin)
    })
  })

  describe('attack progress', () => {
    it('is zero for both combatants right after committing to a fight', () => {
      const { run } = setupRun()

      run.commitToFight()

      expect(run.championAttackProgress).toBe(0)
      expect(run.enemyAttackProgress).toBe(0)
    })

    it('fills toward 1 over the attack interval and resets after an attack lands', () => {
      const { run } = setupRun()
      run.champion.baseStats.attackSpeed = 1
      run.champion.baseStats.hp = 100_000
      run.champion.baseStats.damage = 1

      run.commitToFight()
      vi.advanceTimersByTime(500)

      expect(run.championAttackProgress).toBeCloseTo(0.5, 1)

      vi.advanceTimersByTime(500)

      expect(run.championAttackProgress).toBeCloseTo(0, 1)
    })

    it('is zero when no fight is in progress', () => {
      const run = useRunStore()

      expect(run.championAttackProgress).toBe(0)
      expect(run.enemyAttackProgress).toBe(0)
    })
  })

  describe('bracket progression', () => {
    it('advances to the next round on a champion win', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)

      run.commitToFight()
      vi.advanceTimersByTime(1000)

      expect(run.outcome).toBe('champion')
      expect(run.roundIndex).toBe(1)
      expect(run.bracket!.rounds[1]![0]).toBe(0)
    })

    it('does not advance the round on a champion loss', () => {
      const stores = setupRun()

      loseFirstFight(stores)

      expect(stores.run.outcome).toBe('enemy')
      expect(stores.run.roundIndex).toBe(0)
    })

    it('faces the winner of the neighbouring pair in the second round', () => {
      const { run } = setupFastSecondRound()

      run.commitToFight()
      vi.advanceTimersByTime(1000 + FIGHT_COOLDOWN_MS)

      expect(run.roundIndex).toBe(1)
      expect(run.currentEnemy).toBe(run.bracket!.combatants[2])
    })
  })

  describe('waiting for an opponent', () => {
    it('waits when the Champion is ready before the next opponent has won its own match', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)

      run.commitToFight()
      vi.advanceTimersByTime(1000 + FIGHT_COOLDOWN_MS + 500)

      expect(run.roundIndex).toBe(1)
      expect(run.currentEnemy).toBeUndefined()
      expect(run.isAwaitingOpponent).toBe(true)
      expect(run.isFighting).toBe(false)
    })

    it('starts the fight as soon as the opponent has won its match', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(1000 + FIGHT_COOLDOWN_MS + 500)
      expect(run.isAwaitingOpponent).toBe(true)

      vi.advanceTimersByTime(8000)

      expect(run.isAwaitingOpponent).toBe(false)
      expect(run.currentEnemy).toBeDefined()
      expect(run.roundIndex).toBe(1)
      expect(run.isFighting).toBe(true)
    })

    it('is not waiting while fighting or before a run starts', () => {
      const { run } = setupRun()
      expect(run.isAwaitingOpponent).toBe(false)

      run.commitToFight()

      expect(run.isAwaitingOpponent).toBe(false)
    })
  })

  describe('traits', () => {
    it('grants the champion the defeated enemys traits, boosting the next fight', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)

      run.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(run.outcome).toBe('champion')

      expect(run.champion.traits).toEqual([{ stat: 'damage', amount: 2 }])
      expect(run.championStats.damage).toBe(1002)
    })

    it('combines same-stat-type traits from consecutive wins by simple addition', () => {
      const { run } = setupFastSecondRound()

      run.commitToFight()
      vi.advanceTimersByTime(1000 + FIGHT_COOLDOWN_MS + 1000)

      expect(run.roundIndex).toBe(2)
      expect(run.champion.traits).toEqual(
        expect.arrayContaining([
          { stat: 'damage', amount: 4 },
          { stat: 'attackSpeed', amount: 0.2 },
        ]),
      )
    })
  })

  describe('run status', () => {
    it('ends the run as defeated on a champion loss and refuses a new fight', () => {
      const stores = setupRun()

      loseFirstFight(stores)

      expect(stores.run.outcome).toBe('enemy')
      expect(stores.run.runStatus).toBe('defeated')
      expect(stores.run.isRunning).toBe(false)

      stores.run.commitToFight()
      expect(stores.run.isFighting).toBe(false)
    })

    it('stays defeated instead of restarting on its own', () => {
      const stores = setupRun()

      loseFirstFight(stores)
      vi.advanceTimersByTime(60_000)

      expect(stores.run.runStatus).toBe('defeated')
      expect(stores.run.isFighting).toBe(false)
      expect(stores.run.bracket).toBeDefined()
    })

    it('ends the run in victory on winning the final round', () => {
      const stores = setupRun()

      winWholeBracket(stores)

      expect(stores.run.outcome).toBe('champion')
      expect(stores.run.runStatus).toBe('victorious')
      expect(stores.run.roundIndex).toBe(3)
      expect(stores.run.isRunning).toBe(false)
    })
  })

  describe('ecosystem', () => {
    it("duels enemies not engaged by the champion, transferring the loser's traits to the winner", () => {
      const { run, setup, progression } = setupRun()
      setup.didPlaceType(1, 'raider')
      setup.didPlaceType(2, 'grunt')
      progressOf(progression, 'raider').baseStats.damage = 1000
      const winnerXpBefore = progressOf(progression, 'raider').experienceValue
      const loserXp = progressOf(progression, 'grunt').experienceValue
      run.champion.baseStats.damage = 0
      run.champion.baseStats.hp = 100_000

      run.commitToFight()
      vi.advanceTimersByTime(1000)

      const winner = run.bracket!.combatants[2]
      const loser = run.bracket!.combatants[3]
      expect(winner!.traits).toEqual(
        expect.arrayContaining([
          { stat: 'attackSpeed', amount: 0.2 },
          { stat: 'damage', amount: 2 },
        ]),
      )
      expect(loser!.traits).toEqual([])
      expect(winner!.experienceValue).toBe(winnerXpBefore + loserXp)
      expect(loser!.experienceValue).toBe(0)
      expect(loser!.goldValue).toBe(0)
      expect(run.bracket!.rounds[1]![1]).toBe(2)
    })

    it('does not duel the enemy currently engaged by the champion', () => {
      const { run } = setupRun()
      run.champion.baseStats.damage = 0
      run.champion.baseStats.hp = 100_000
      const baselineTraits = [...run.champion.traits]

      run.commitToFight()
      const engaged = run.bracket!.combatants[1]!
      const engagedTraits = [...engaged.traits]
      vi.advanceTimersByTime(60_000)

      expect(engaged.traits).toEqual(engagedTraits)
      expect(run.bracket!.rounds[1]![0]).toBeUndefined()
      expect(run.champion.traits).toEqual(baselineTraits)
    })

    it('stops duelling once the run has concluded', () => {
      const stores = setupRun()
      loseFirstFight(stores)
      expect(stores.run.runStatus).toBe('defeated')

      const snapshot = JSON.stringify(stores.run.bracket)
      vi.advanceTimersByTime(60_000)

      expect(JSON.stringify(stores.run.bracket)).toBe(snapshot)
    })

    it('wipes ecosystem-earned traits and experience on restart', () => {
      const stores = setupRun()
      stores.setup.didPlaceType(1, 'raider')
      progressOf(stores.progression, 'raider').baseStats.damage = 1000
      loseFirstFight(stores)
      const duelled = stores.run.bracket!.combatants[2]!
      expect(duelled.traits.length).toBeGreaterThan(1)

      stores.run.restart()

      const fresh = stores.run.bracket!.combatants[2]!
      expect(fresh.traits).toEqual([findEnemyType('raider')!.trait])
      expect(fresh.experienceValue).toBe(findEnemyType('raider')!.experienceValue)
    })
  })

  describe('progression', () => {
    it('grants experience scaled by the defeated enemys value and the round reached, on a champion win', () => {
      const { run, progression } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      const expectedReward = experienceReward(run.currentEnemy!.experienceValue, run.roundIndex)

      vi.advanceTimersByTime(1000)

      expect(run.outcome).toBe('champion')
      expect(progression.experience).toBe(expectedReward)
    })

    it('grants no experience on a champion loss', () => {
      const stores = setupRun()

      loseFirstFight(stores)

      expect(stores.run.outcome).toBe('enemy')
      expect(stores.progression.experience).toBe(0)
    })

    it('keeps experience already banked from earlier wins after a later loss ends the run', () => {
      const { run, progression } = setupFastSecondRound()
      run.commitToFight()
      vi.advanceTimersByTime(1000)
      const bankedAfterWin = progression.experience
      expect(bankedAfterWin).toBeGreaterThan(0)

      run.champion.baseStats.damage = 1
      run.champion.baseStats.hp = 1
      vi.advanceTimersByTime(FIGHT_COOLDOWN_MS + 2000)

      expect(run.outcome).toBe('enemy')
      expect(progression.experience).toBe(bankedAfterWin)
    })

    it('records the defeated Enemy type as beaten', () => {
      const { run, progression } = setupRun('scout')
      makeChampionUnkillable(run)
      run.commitToFight()

      vi.advanceTimersByTime(1000)

      const index = ENEMY_CATALOG.findIndex((type) => type.id === 'scout')
      expect(progression.enemyProgress[index]!.defeated).toBe(true)
      expect(progression.enemyProgress[0]!.defeated).toBe(false)
    })
  })

  describe('gold and enemy upgrades', () => {
    it('exposes the current enemys Gold and Experience reward for display', () => {
      const { run } = setupRun()
      run.commitToFight()

      expect(run.currentEnemyRewards).toEqual({
        experience: experienceReward(run.currentEnemy!.experienceValue, run.roundIndex),
        gold: goldReward(run.currentEnemy!.goldValue, run.roundIndex),
      })
    })

    it('has no reward to display without an opponent', () => {
      expect(useRunStore().currentEnemyRewards).toBeUndefined()
    })

    it('grants Gold scaled by the defeated enemys value and the round reached, on a champion win', () => {
      const { run, progression } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      const expectedGold = goldReward(run.currentEnemy!.goldValue, run.roundIndex)

      vi.advanceTimersByTime(1000)

      expect(run.outcome).toBe('champion')
      expect(progression.gold).toBe(expectedGold)
    })

    it('rejects an Enemy Upgrade purchase for a type not yet defeated', () => {
      const { run, progression } = setupRun()
      progression.gold = 1_000_000

      expect(run.didPurchaseEnemyUpgrade(0)).toBe(false)
      expect(progression.gold).toBe(1_000_000)
    })

    it('applies an Enemy Upgrade for a defeated type, deducting its cost from Gold', () => {
      const { run, progression } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(run.outcome).toBe('champion')

      progression.gold = run.upgradeCostOf(0)

      expect(run.didPurchaseEnemyUpgrade(0)).toBe(true)
      expect(progression.gold).toBe(0)
    })

    it('pays off in the next run, with a stronger Enemy of that type and Gold kept across the restart', () => {
      const { run, progression } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(1000)
      const damageBefore = run.bracket!.combatants[1]!.baseStats.damage
      progression.gold = run.upgradeCostOf(0)
      expect(run.didPurchaseEnemyUpgrade(0)).toBe(true)
      const goldAfterPurchase = progression.gold

      run.champion.baseStats.damage = 1
      run.champion.baseStats.hp = 1
      vi.advanceTimersByTime(FIGHT_COOLDOWN_MS + 60_000)
      expect(run.runStatus).toBe('defeated')
      run.restart()

      expect(progression.gold).toBe(goldAfterPurchase)
      expect(run.bracket!.combatants[1]!.baseStats.damage).toBeGreaterThan(damageBefore)
    })
  })

  describe('automatic fight chaining', () => {
    it('starts the next rounds fight on its own once the cooldown after a win elapses', () => {
      const { run } = setupFastSecondRound()
      run.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(run.outcome).toBe('champion')
      expect(run.isFighting).toBe(false)

      vi.advanceTimersByTime(FIGHT_COOLDOWN_MS)

      expect(run.isFighting).toBe(true)
      expect(run.roundIndex).toBe(1)
    })
  })

  describe('cooldown progress', () => {
    it('is zero outside a cooldown', () => {
      const { run } = setupRun()
      expect(run.cooldownProgress).toBe(0)

      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(500)

      expect(run.cooldownProgress).toBe(0)
    })

    it('fills toward 1 over the cooldown after a win', () => {
      const { run } = setupRun()
      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(1000)
      expect(run.cooldownProgress).toBeCloseTo(0, 1)

      vi.advanceTimersByTime(500)

      expect(run.cooldownProgress).toBeCloseTo(0.5, 1)
    })

    it('is zero after a loss, since the run simply ends', () => {
      const stores = setupRun()

      loseFirstFight(stores)

      expect(stores.run.cooldownProgress).toBe(0)
    })

    it('is zero once the next fight starts', () => {
      const { run } = setupFastSecondRound()
      run.commitToFight()
      vi.advanceTimersByTime(1000 + FIGHT_COOLDOWN_MS)

      expect(run.isFighting).toBe(true)
      expect(run.cooldownProgress).toBe(0)
    })
  })

  describe('restart', () => {
    it('is refused while a run is in progress', () => {
      const { run } = setupRun()
      run.commitToFight()
      const bracket = run.bracket

      run.restart()

      expect(run.bracket).toBe(bracket)
    })

    it('is refused before any run has started', () => {
      const { run } = setupRun()

      run.restart()

      expect(run.runStatus).toBe('setup')
      expect(run.bracket).toBeUndefined()
    })

    it('begins a fresh run at once with the same setup after a defeat, granting nothing', () => {
      const stores = setupRun()
      loseFirstFight(stores)
      expect(stores.run.runStatus).toBe('defeated')

      stores.run.restart()

      expect(stores.run.runStatus).toBe('active')
      expect(stores.run.roundIndex).toBe(0)
      expect(stores.run.champion.traits).toEqual([])
      expect(stores.run.champion.baseStats).toEqual({ attackSpeed: 1, damage: 20, hp: 200 })
      expect(stores.run.outcome).toBeUndefined()
      expect(stores.run.isFighting).toBe(true)
      expect(stores.setup.isLocked).toBe(true)
      expect(stores.setup.placement.every((slot) => slot === 'grunt')).toBe(true)
      expect(stores.progression.prestigeTokens).toBe(0)
      expect(stores.progression.ladderLevel).toBe(0)
    })

    it('is offered after a victory too, and grants no prestige', () => {
      const stores = setupRun()
      winWholeBracket(stores)
      expect(stores.run.runStatus).toBe('victorious')

      stores.run.restart()

      expect(stores.run.runStatus).toBe('active')
      expect(stores.run.roundIndex).toBe(0)
      expect(stores.progression.prestigeTokens).toBe(0)
    })

    it('leaves enemy difficulty unchanged', () => {
      const stores = setupRun()
      loseFirstFight(stores)
      progressOf(stores.progression, 'grunt').baseStats.damage = 8

      stores.run.restart()

      expect(stores.run.bracket!.combatants[1]!.baseStats.damage).toBe(8)
      expect(stores.run.bracket!.combatants[1]!.baseStats.hp).toBe(100)
    })
  })

  describe('edit', () => {
    it('is refused while a run is in progress', () => {
      const { run, setup } = setupRun()
      run.commitToFight()

      run.edit()

      expect(run.runStatus).toBe('active')
      expect(setup.isLocked).toBe(true)
    })

    it('returns to setup with the placement kept and editable, and a fresh champion', () => {
      const stores = setupRun()
      loseFirstFight(stores)

      stores.run.edit()

      expect(stores.run.runStatus).toBe('setup')
      expect(stores.run.bracket).toBeUndefined()
      expect(stores.run.outcome).toBeUndefined()
      expect(stores.run.champion.baseStats).toEqual({ attackSpeed: 1, damage: 20, hp: 200 })
      expect(stores.setup.isLocked).toBe(false)
      expect(stores.setup.placement.every((slot) => slot === 'grunt')).toBe(true)
    })

    it('lets the player revise the placement and commit a different bracket', () => {
      const stores = setupRun()
      loseFirstFight(stores)
      stores.run.edit()

      stores.setup.didPlaceType(0, 'scout')
      stores.run.commitToFight()

      expect(stores.run.runStatus).toBe('active')
      expect(stores.run.bracket!.combatants[1]!.baseStats).toEqual(
        findEnemyType('scout')!.baseStats,
      )
    })

    it('stops all ticking while in setup', () => {
      const stores = setupRun()
      winWholeBracket(stores)
      stores.run.edit()

      vi.advanceTimersByTime(60_000)

      expect(stores.run.isRunning).toBe(false)
      expect(stores.run.isFighting).toBe(false)
    })
  })

  describe('prestige', () => {
    it('is refused while the run is still active', () => {
      const { run, progression } = setupRun()
      run.commitToFight()

      run.prestige()

      expect(progression.prestigeTokens).toBe(0)
      expect(progression.ladderLevel).toBe(0)
      expect(run.runStatus).toBe('active')
    })

    it('is refused after a defeat', () => {
      const stores = setupRun()

      loseFirstFight(stores)
      stores.run.prestige()

      expect(stores.progression.prestigeTokens).toBe(0)
      expect(stores.progression.ladderLevel).toBe(0)
      expect(stores.run.runStatus).toBe('defeated')
    })

    it('grants one prestige token and one Ladder Level after the final round is won, and returns to setup', () => {
      const stores = setupRun()
      winWholeBracket(stores)
      expect(stores.run.runStatus).toBe('victorious')

      stores.run.prestige()

      expect(stores.progression.prestigeTokens).toBe(1)
      expect(stores.progression.ladderLevel).toBe(1)
      expect(stores.run.runStatus).toBe('setup')
      expect(stores.run.roundIndex).toBe(0)
      expect(stores.run.champion.traits).toEqual([])
      expect(stores.setup.isLocked).toBe(false)
      expect(stores.setup.placement.every((slot) => slot === 'grunt')).toBe(true)
    })

    it('raises every enemys damage and hp in the next bracket', () => {
      const stores = setupRun()
      stores.setup.didPlaceType(14, 'raider')
      winWholeBracket(stores)
      stores.run.prestige()

      stores.run.commitToFight()

      expect(stores.run.bracket!.combatants[1]!.baseStats.damage).toBeCloseTo(9.2)
      expect(stores.run.bracket!.combatants[1]!.baseStats.hp).toBeCloseTo(115)
      expect(stores.run.bracket!.combatants[15]!.baseStats.damage).toBeCloseTo(23)
      expect(stores.run.bracket!.combatants[15]!.baseStats.hp).toBeCloseTo(276)
    })

    it('stacks the Ladder Level multiplier on top of a purchased Enemy Upgrade', () => {
      const stores = setupRun()
      winWholeBracket(stores)
      stores.progression.gold = stores.run.upgradeCostOf(0)
      expect(stores.run.didPurchaseEnemyUpgrade(0)).toBe(true)
      stores.run.prestige()

      stores.run.commitToFight()

      expect(stores.run.bracket!.combatants[1]!.baseStats.damage).toBeCloseTo(8 * 1.15 * 1.15)
    })

    it('feeds Ladder Level into the displayed and granted rewards', () => {
      const stores = setupRun()
      winWholeBracket(stores)
      stores.run.prestige()
      const experienceBefore = stores.progression.experience
      const goldBefore = stores.progression.gold

      makeChampionUnkillable(stores.run)
      stores.run.commitToFight()
      expect(stores.run.currentEnemyRewards).toEqual({ experience: 20, gold: 30 })

      vi.advanceTimersByTime(1000)

      expect(stores.run.outcome).toBe('champion')
      expect(stores.progression.experience - experienceBefore).toBe(20)
      expect(stores.progression.gold - goldBefore).toBe(30)
    })
  })
})
