import { describe, it, expect } from 'vitest'
import {
  accumulatePassiveExp,
  applyPassiveGrowth,
  createPassiveGrowthState,
  passiveLevelCost,
  passiveMultiplier,
  PASSIVE_GROWTH_RULES,
} from '../passiveGrowth'

const BASE_STATS = { attackSpeed: 1, damage: 20, hp: 200, regen: 2 }
const NO_ACTION = { damageDealt: 0, damageTaken: 0, hpRegenerated: 0 }

describe('passiveGrowth', () => {
  it('starts every stat locked at a 1x multiplier', () => {
    const state = createPassiveGrowthState()
    expect(applyPassiveGrowth(BASE_STATS, state)).toEqual(BASE_STATS)
  })

  it('ignores actions for stats that are not unlocked', () => {
    const state = createPassiveGrowthState()
    accumulatePassiveExp(state, { ...NO_ACTION, damageDealt: 1_000_000 })
    expect(state.damage).toEqual({ unlocked: false, exp: 0, level: 0 })
  })

  it('routes each action source to its own stat', () => {
    const state = createPassiveGrowthState()
    state.damage.unlocked = true
    state.hp.unlocked = true
    state.regen.unlocked = true
    accumulatePassiveExp(state, { damageDealt: 10, damageTaken: 0, hpRegenerated: 0 })
    expect(state.damage.exp).toBeCloseTo(10 * PASSIVE_GROWTH_RULES.damage.expPerAction)
    expect(state.hp.exp).toBe(0)
    expect(state.regen.exp).toBe(0)
  })

  it('converts accumulated exp into levels along the cost curve and keeps the remainder', () => {
    const state = createPassiveGrowthState()
    state.hp.unlocked = true
    const firstCost = passiveLevelCost('hp', 0)
    const secondCost = passiveLevelCost('hp', 1)
    const perAction = PASSIVE_GROWTH_RULES.hp.expPerAction
    accumulatePassiveExp(state, {
      ...NO_ACTION,
      damageTaken: (firstCost + secondCost + 3) / perAction,
    })
    expect(state.hp.level).toBe(2)
    expect(state.hp.exp).toBeCloseTo(3)
  })

  it('never levels Attack Speed, which has no source', () => {
    const state = createPassiveGrowthState()
    state.attackSpeed.unlocked = true
    accumulatePassiveExp(state, { damageDealt: 1e6, damageTaken: 1e6, hpRegenerated: 1e6 })
    expect(state.attackSpeed.level).toBe(0)
  })

  it('multiplies the final stat by one plus a flat step per level', () => {
    const state = createPassiveGrowthState()
    state.damage.level = 4
    const result = applyPassiveGrowth(BASE_STATS, state)
    expect(result.damage).toBeCloseTo(20 * passiveMultiplier('damage', 4))
    expect(result.hp).toBe(200)
  })
})
