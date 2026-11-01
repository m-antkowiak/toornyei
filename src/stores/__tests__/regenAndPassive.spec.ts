import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRunStore } from '../run'
import { useProgressionStore } from '../progression'
import { useSetupStore, ENEMY_SLOT_COUNT } from '../setup'

const WHOLE_BRACKET_MS = 60_000
const FIRST_WIN_MS = 1020

function setupRun() {
  const run = useRunStore()
  const setup = useSetupStore()
  const progression = useProgressionStore()
  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot++) setup.didPlaceType(slot, 'grunt')
  run.champion.baseStats.damage = 1000
  run.champion.baseStats.hp = 200
  return { run, progression }
}

describe('regen and passive growth in the run', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('carries HP over between won rounds', () => {
    const { run } = setupRun()
    run.commitToFight()

    vi.advanceTimersByTime(FIRST_WIN_MS)

    expect(run.championHp).toBeLessThan(run.championStats.hp)
    expect(run.championHp).toBeGreaterThan(0)
  })

  it('regenerates during the wait between rounds', () => {
    const { run } = setupRun()
    run.commitToFight()
    vi.advanceTimersByTime(FIRST_WIN_MS)
    const hpAfterWin = run.championHp
    run.champion.baseStats.regen = 4

    vi.advanceTimersByTime(500)

    expect(run.championHp).toBeCloseTo(hpAfterWin + 2, 0)
  })

  it('starts a Restart at full HP', () => {
    const { run } = setupRun()
    run.commitToFight()
    vi.advanceTimersByTime(WHOLE_BRACKET_MS)

    run.restart()

    expect(run.championHp).toBe(run.championStats.hp)
  })

  it('grows an unlocked passive from fight actions and ignores locked ones', () => {
    const { run, progression } = setupRun()
    progression.grantExperience(1000)
    progression.didUnlockPassive('hp')
    run.commitToFight()

    vi.advanceTimersByTime(WHOLE_BRACKET_MS)

    const hp = progression.passiveGrowth.hp
    expect(hp.exp + hp.level).toBeGreaterThan(0)
    expect(progression.passiveGrowth.damage).toEqual({ unlocked: false, exp: 0, level: 0 })
  })

  it('multiplies the Champions stat by its passive level', () => {
    const { run, progression } = setupRun()
    const before = run.championStats.damage
    progression.passiveGrowth.damage.level = 10

    expect(run.championStats.damage).toBeCloseTo(before * 1.5)
  })
})

describe('passive growth in the progression store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('charges experience once to unlock a stat', () => {
    const progression = useProgressionStore()
    progression.grantExperience(progression.passiveUnlockCostOf('damage'))

    expect(progression.didUnlockPassive('damage')).toBe(true)
    expect(progression.experience).toBe(0)
    expect(progression.didUnlockPassive('damage')).toBe(false)
  })

  it('refuses to unlock without enough experience or for Attack Speed', () => {
    const progression = useProgressionStore()
    expect(progression.didUnlockPassive('hp')).toBe(false)
    progression.grantExperience(100_000)
    expect(progression.didUnlockPassive('attackSpeed')).toBe(false)
  })

  it('resets on prestige', () => {
    const progression = useProgressionStore()
    progression.grantExperience(1000)
    progression.didUnlockPassive('regen')
    progression.passiveGrowth.regen.level = 3

    progression.didPrestige()

    expect(progression.passiveGrowth.regen).toEqual({ unlocked: false, exp: 0, level: 0 })
  })

  it('persists to localStorage and rehydrates', () => {
    const first = useProgressionStore()
    first.grantExperience(1000)
    first.didUnlockPassive('damage')
    first.passiveGrowth.damage.level = 2
    first.passiveGrowth.damage.exp = 7

    setActivePinia(createPinia())
    const second = useProgressionStore()

    expect(second.passiveGrowth.damage).toEqual({ unlocked: true, exp: 7, level: 2 })
    expect(second.experience).toBe(0)
  })

  it('starts fresh when the stored data is corrupt', () => {
    localStorage.setItem('toornyei:passive', 'not json')
    const progression = useProgressionStore()
    expect(progression.passiveGrowth.damage).toEqual({ unlocked: false, exp: 0, level: 0 })
  })
})
