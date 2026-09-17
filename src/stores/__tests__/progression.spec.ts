import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProgressionStore } from '../progression'

describe('progression store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with zero experience', () => {
    const store = useProgressionStore()
    expect(store.experience).toBe(0)
  })

  it('accumulates experience granted across multiple calls', () => {
    const store = useProgressionStore()
    store.grantExperience(10)
    store.grantExperience(5)
    expect(store.experience).toBe(15)
  })

  it('starts with zero gold', () => {
    const store = useProgressionStore()
    expect(store.gold).toBe(0)
  })

  it('accumulates gold granted across multiple calls', () => {
    const store = useProgressionStore()
    store.grantGold(10)
    store.grantGold(5)
    expect(store.gold).toBe(15)
  })

  describe('enemy upgrades', () => {
    it('starts every enemy as not yet defeated', () => {
      const store = useProgressionStore()
      expect(store.enemyProgress.every((enemy) => !enemy.defeated)).toBe(true)
    })

    it('rejects an upgrade purchase for an enemy not yet defeated', () => {
      const store = useProgressionStore()
      store.gold = 1_000_000

      expect(store.didPurchaseEnemyUpgrade(0)).toBe(false)
      expect(store.gold).toBe(1_000_000)
    })

    it('rejects an upgrade purchase when gold is insufficient', () => {
      const store = useProgressionStore()
      store.recordEnemyDefeat(0)
      store.gold = store.upgradeCostOf(0) - 1

      expect(store.didPurchaseEnemyUpgrade(0)).toBe(false)
    })

    it('applies an upgrade for a defeated enemy, deducting its cost and raising its stats and rewards', () => {
      const store = useProgressionStore()
      store.recordEnemyDefeat(0)
      const enemy = store.enemyProgress[0]!
      const originalDamage = enemy.baseStats.damage
      const originalGoldValue = enemy.goldValue
      const originalExperienceValue = enemy.experienceValue
      const cost = store.upgradeCostOf(0)
      store.gold = cost

      expect(store.didPurchaseEnemyUpgrade(0)).toBe(true)

      expect(store.gold).toBe(0)
      expect(enemy.baseStats.damage).toBeGreaterThan(originalDamage)
      expect(enemy.goldValue).toBeGreaterThan(originalGoldValue)
      expect(enemy.experienceValue).toBeGreaterThan(originalExperienceValue)
    })

    it('raises the cost of each subsequent upgrade for the same enemy', () => {
      const store = useProgressionStore()
      store.recordEnemyDefeat(0)
      const firstCost = store.upgradeCostOf(0)
      store.gold = firstCost
      store.didPurchaseEnemyUpgrade(0)

      expect(store.upgradeCostOf(0)).toBeGreaterThan(firstCost)
    })
  })
})
