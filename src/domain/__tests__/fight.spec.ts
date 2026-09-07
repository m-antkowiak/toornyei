import { describe, it, expect } from 'vitest'
import { createFight, advanceFight } from '../fight'

describe('fight', () => {
  it('champion wins when it out-damages the enemy', () => {
    const fight = createFight(
      { attackSpeed: 1, damage: 10, hp: 100 },
      { attackSpeed: 1, damage: 5, hp: 100 },
    )

    advanceFight(fight, 20_000)

    expect(fight.outcome).toBe('champion')
    expect(fight.enemy.currentHp).toBe(0)
    expect(fight.champion.currentHp).toBeGreaterThan(0)
  })

  it('champion loses when the enemy out-damages it', () => {
    const fight = createFight(
      { attackSpeed: 1, damage: 5, hp: 100 },
      { attackSpeed: 1, damage: 10, hp: 100 },
    )

    advanceFight(fight, 20_000)

    expect(fight.outcome).toBe('enemy')
    expect(fight.champion.currentHp).toBe(0)
  })

  it('deals damage once per attack interval based on attack speed', () => {
    const fight = createFight(
      { attackSpeed: 2, damage: 10, hp: 100 },
      { attackSpeed: 1, damage: 1000, hp: 100 },
    )

    advanceFight(fight, 500)

    expect(fight.enemy.currentHp).toBe(90)
  })

  it('does not advance an already-resolved fight', () => {
    const fight = createFight(
      { attackSpeed: 1, damage: 1000, hp: 100 },
      { attackSpeed: 1, damage: 1, hp: 100 },
    )

    advanceFight(fight, 1000)
    expect(fight.outcome).toBe('champion')
    const enemyHpAfterWin = fight.enemy.currentHp

    advanceFight(fight, 5000)
    expect(fight.enemy.currentHp).toBe(enemyHpAfterWin)
  })

  it('resolves a mutual kill in the same tick as an enemy win', () => {
    const fight = createFight(
      { attackSpeed: 1, damage: 100, hp: 100 },
      { attackSpeed: 1, damage: 100, hp: 100 },
    )

    advanceFight(fight, 1000)

    expect(fight.outcome).toBe('enemy')
  })
})
