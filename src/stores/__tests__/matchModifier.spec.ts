import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMatchModifierStore } from '../matchModifier'
import { useRunStore } from '../run'
import { useProgressionStore } from '../progression'
import { useSetupStore, ENEMY_SLOT_COUNT } from '../setup'
import { experienceReward } from '@/domain/experience'

const TAKE_LAST_RANDOM = () => 0.99
const WHOLE_BRACKET_MS = 60_000
const CHAMPION_FIRST_MATCH = { round: 0, index: 0 }

function offeredIds(modifiers: ReturnType<typeof useMatchModifierStore>): string[] {
  return modifiers.offer.map((modifier) => modifier.id)
}

function setupRun() {
  const run = useRunStore()
  const setup = useSetupStore()
  const progression = useProgressionStore()
  const modifiers = useMatchModifierStore()
  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot++) setup.didPlaceType(slot, 'grunt')
  return { run, setup, progression, modifiers }
}

function makeChampionUnkillable(run: ReturnType<typeof useRunStore>) {
  run.champion.baseStats.damage = 1000
  run.champion.baseStats.hp = 100_000
}

function makeChampionLose(run: ReturnType<typeof useRunStore>) {
  run.champion.baseStats.damage = 1
  run.champion.baseStats.hp = 1
}

describe('match modifier store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with no modifier and no offer', () => {
    const modifiers = useMatchModifierStore()
    expect(modifiers.offer).toEqual([])
    expect(modifiers.placedModifier).toBeUndefined()
  })

  it('places an offered modifier, consuming the offer', () => {
    const { modifiers } = setupRun()
    modifiers.drawOffer(TAKE_LAST_RANDOM)
    const [chosen] = offeredIds(modifiers)

    expect(modifiers.didPlaceFromOffer(chosen!, CHAMPION_FIRST_MATCH)).toBe(true)

    expect(modifiers.placedModifier?.id).toBe(chosen)
    expect(modifiers.placedPosition).toEqual(CHAMPION_FIRST_MATCH)
    expect(modifiers.offer).toEqual([])
  })

  it('refuses a modifier that was not offered or a match outside the bracket', () => {
    const { modifiers } = setupRun()
    modifiers.drawOffer(TAKE_LAST_RANDOM)
    const [chosen] = offeredIds(modifiers)

    expect(modifiers.didPlaceFromOffer('not-offered', CHAMPION_FIRST_MATCH)).toBe(false)
    expect(modifiers.didPlaceFromOffer(chosen!, { round: 9, index: 0 })).toBe(false)
    expect(modifiers.placedModifier).toBeUndefined()
  })

  it('moves the placed modifier to another match', () => {
    const { modifiers } = setupRun()
    modifiers.drawOffer()
    modifiers.didPlaceFromOffer(offeredIds(modifiers)[0]!, CHAMPION_FIRST_MATCH)

    expect(modifiers.didMovePlaced({ round: 1, index: 0 })).toBe(true)

    expect(modifiers.placedPosition).toEqual({ round: 1, index: 0 })
  })

  it('skips an offer', () => {
    const { modifiers } = setupRun()
    modifiers.drawOffer()

    expect(modifiers.didSkipOffer()).toBe(true)

    expect(modifiers.offer).toEqual([])
  })

  it('locks placing, moving and skipping while a run is active', () => {
    const { run, modifiers } = setupRun()
    modifiers.drawOffer()
    modifiers.didPlaceFromOffer(offeredIds(modifiers)[0]!, CHAMPION_FIRST_MATCH)
    modifiers.drawOffer()
    makeChampionUnkillable(run)
    run.commitToFight()
    modifiers.drawOffer()

    expect(modifiers.didMovePlaced({ round: 1, index: 0 })).toBe(false)
    expect(modifiers.didPlaceFromOffer(offeredIds(modifiers)[0]!, { round: 1, index: 0 })).toBe(
      false,
    )
    expect(modifiers.didSkipOffer()).toBe(false)
  })

  describe('run flow', () => {
    it('offers three modifiers on defeat, and the same three after Edit', () => {
      const { run, modifiers } = setupRun()
      makeChampionLose(run)
      run.commitToFight()
      vi.advanceTimersByTime(WHOLE_BRACKET_MS)
      expect(run.runStatus).toBe('defeated')
      const offered = offeredIds(modifiers)

      run.edit()

      expect(offered).toHaveLength(3)
      expect(offeredIds(modifiers)).toEqual(offered)
    })

    it('keeps the placed modifier and drops the offer on Restart', () => {
      const { run, modifiers } = setupRun()
      modifiers.drawOffer()
      modifiers.didPlaceFromOffer(offeredIds(modifiers)[0]!, CHAMPION_FIRST_MATCH)
      const placedId = modifiers.placedModifier?.id
      makeChampionLose(run)
      run.commitToFight()
      vi.advanceTimersByTime(WHOLE_BRACKET_MS)
      expect(offeredIds(modifiers)).toHaveLength(3)

      run.restart()

      expect(modifiers.offer).toEqual([])
      expect(modifiers.placedModifier?.id).toBe(placedId)
    })

    it('clears the modifier on Prestige and offers three new ones', () => {
      const { run, modifiers } = setupRun()
      modifiers.drawOffer()
      modifiers.didPlaceFromOffer(offeredIds(modifiers)[0]!, CHAMPION_FIRST_MATCH)
      makeChampionUnkillable(run)
      run.commitToFight()
      vi.advanceTimersByTime(WHOLE_BRACKET_MS)
      expect(run.runStatus).toBe('victorious')

      run.prestige()

      expect(modifiers.placedModifier).toBeUndefined()
      expect(modifiers.offer).toHaveLength(3)
    })

    it('doubles banked experience when Feast sits on the Champions match', () => {
      const { run, progression, modifiers } = setupRun()
      modifiers.drawOffer(TAKE_LAST_RANDOM)
      modifiers.didPlaceFromOffer('feast', CHAMPION_FIRST_MATCH)
      makeChampionUnkillable(run)
      run.commitToFight()
      expect(run.currentEnemyRewards?.experience).toBe(experienceReward(20, 0))

      vi.advanceTimersByTime(1100)

      expect(progression.experience).toBe(experienceReward(20, 0))
    })

    it('applies a modifier on a match the Champion is not in', () => {
      const { run, modifiers } = setupRun()
      modifiers.drawOffer(TAKE_LAST_RANDOM)
      modifiers.didPlaceFromOffer('potent-blood', { round: 0, index: 1 })
      makeChampionUnkillable(run)
      run.commitToFight()

      const duelWinnerSlot = run.bracket!.rounds[1]![1]!
      const duelWinner = run.bracket!.combatants[duelWinnerSlot]!
      expect(duelWinner.traits.find((trait) => trait.stat === 'damage')?.amount).toBe(6)
    })
  })
})
