import { describe, it, expect } from 'vitest'
import { createFight, advanceFight, predictFightOutcome } from '../fight'

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

  describe('predictFightOutcome', () => {
    it('names the first side when it out-damages the second', () => {
      expect(
        predictFightOutcome(
          { attackSpeed: 1, damage: 10, hp: 100 },
          { attackSpeed: 1, damage: 5, hp: 100 },
        ),
      ).toBe('champion')
    })

    it('names the second side when it out-damages the first', () => {
      expect(
        predictFightOutcome(
          { attackSpeed: 1, damage: 5, hp: 100 },
          { attackSpeed: 1, damage: 10, hp: 100 },
        ),
      ).toBe('enemy')
    })

    it('agrees with the outcome of playing the same fight out tick by tick', () => {
      const first = { attackSpeed: 1.3, damage: 7, hp: 90 }
      const second = { attackSpeed: 0.9, damage: 11, hp: 120 }
      const played = createFight(first, second)
      for (let elapsed = 0; elapsed < 600_000 && played.outcome === undefined; elapsed += 20) {
        advanceFight(played, 20)
      }

      expect(predictFightOutcome(first, second)).toBe(played.outcome)
    })

    it('does not change the stats it was given', () => {
      const first = { attackSpeed: 1, damage: 10, hp: 100 }
      const second = { attackSpeed: 1, damage: 5, hp: 100 }

      predictFightOutcome(first, second)

      expect(first).toEqual({ attackSpeed: 1, damage: 10, hp: 100 })
      expect(second).toEqual({ attackSpeed: 1, damage: 5, hp: 100 })
    })

    it('settles a stalemate where nobody can deal damage in favour of the first side', () => {
      expect(
        predictFightOutcome(
          { attackSpeed: 1, damage: 0, hp: 100 },
          { attackSpeed: 1, damage: 0, hp: 100 },
        ),
      ).toBe('champion')
    })
  })
})
