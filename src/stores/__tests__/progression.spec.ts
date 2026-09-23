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
  describe('prestige', () => {
    it('starts with no prestige tokens and Ladder Level zero', () => {
      const store = useProgressionStore()
      expect(store.prestigeTokens).toBe(0)
      expect(store.ladderLevel).toBe(0)
    })

    it('grants exactly one token and one Ladder Level per prestige', () => {
      const store = useProgressionStore()
      store.didPrestige()
      expect(store.prestigeTokens).toBe(1)
      expect(store.ladderLevel).toBe(1)

      store.didPrestige()
      expect(store.prestigeTokens).toBe(2)
      expect(store.ladderLevel).toBe(2)
    })
  })
  describe('meta unlocks', () => {
    it('lists a single placeholder unlock, initially locked', () => {
      const store = useProgressionStore()
      expect(store.metaUnlocks).toEqual([{ id: 'placeholder', unlocked: false }])
    })

    it('rejects a purchase when the token balance is insufficient', () => {
      const store = useProgressionStore()

      expect(store.didPurchaseMetaUnlock('placeholder')).toBe(false)
      expect(store.metaUnlocks[0]!.unlocked).toBe(false)
    })

    it('deducts one token and marks the unlock as unlocked on purchase', () => {
      const store = useProgressionStore()
      store.didPrestige()

      expect(store.didPurchaseMetaUnlock('placeholder')).toBe(true)
      expect(store.prestigeTokens).toBe(0)
      expect(store.metaUnlocks[0]!.unlocked).toBe(true)
    })

    it('rejects buying an already unlocked entry without charging a token', () => {
      const store = useProgressionStore()
      store.didPrestige()
      store.didPrestige()
      store.didPurchaseMetaUnlock('placeholder')

      expect(store.didPurchaseMetaUnlock('placeholder')).toBe(false)
      expect(store.prestigeTokens).toBe(1)
    })

    it('rejects an unknown unlock id', () => {
      const store = useProgressionStore()
      store.didPrestige()

      expect(store.didPurchaseMetaUnlock('nope')).toBe(false)
      expect(store.prestigeTokens).toBe(1)
    })
  })
  describe('persistence', () => {
    it('rehydrates tokens, Ladder Level and unlocks after a simulated reload', () => {
      const first = useProgressionStore()
      first.didPrestige()
      first.didPrestige()
      first.didPurchaseMetaUnlock('placeholder')

      setActivePinia(createPinia())
      const reloaded = useProgressionStore()

      expect(reloaded.prestigeTokens).toBe(1)
      expect(reloaded.ladderLevel).toBe(2)
      expect(reloaded.metaUnlocks).toEqual([{ id: 'placeholder', unlocked: true }])
    })

    it('leaves gold and experience in memory only', () => {
      const first = useProgressionStore()
      first.grantGold(50)
      first.grantExperience(50)
      first.didPrestige()

      setActivePinia(createPinia())
      const reloaded = useProgressionStore()

      expect(reloaded.gold).toBe(0)
      expect(reloaded.experience).toBe(0)
    })

    it('starts fresh when the stored data is corrupt', () => {
      localStorage.setItem('toornyei:meta', 'not json')

      const store = useProgressionStore()

      expect(store.prestigeTokens).toBe(0)
      expect(store.ladderLevel).toBe(0)
    })
  })
  describe('champion upgrades', () => {
    it('rejects a purchase when experience is insufficient', () => {
      const store = useProgressionStore()
      store.grantExperience(store.championUpgradeCostOf('damage') - 1)

      expect(store.didPurchaseChampionUpgrade('damage')).toBe(false)
      expect(store.championUpgrades.damage).toBe(0)
    })

    it('spends experience and raises only the purchased level', () => {
      const store = useProgressionStore()
      const cost = store.championUpgradeCostOf('hp')
      store.grantExperience(cost + 5)

      expect(store.didPurchaseChampionUpgrade('hp')).toBe(true)
      expect(store.experience).toBe(5)
      expect(store.championUpgrades).toEqual({ damage: 0, attackSpeed: 0, hp: 1 })
    })

    it('raises the cost of the next level of the same upgrade', () => {
      const store = useProgressionStore()
      const firstCost = store.championUpgradeCostOf('damage')
      store.grantExperience(firstCost)
      store.didPurchaseChampionUpgrade('damage')

      expect(store.championUpgradeCostOf('damage')).toBeGreaterThan(firstCost)
    })

    it('clears experience and upgrade levels on prestige', () => {
      const store = useProgressionStore()
      store.grantExperience(100)
      store.didPurchaseChampionUpgrade('damage')

      store.didPrestige()

      expect(store.experience).toBe(0)
      expect(store.championUpgrades).toEqual({ damage: 0, attackSpeed: 0, hp: 0 })
    })
  })

  describe('hard reset', () => {
    it('wipes every progression value and the persisted data', () => {
      const store = useProgressionStore()
      store.grantGold(50)
      store.grantExperience(50)
      store.didPrestige()
      store.didPurchaseMetaUnlock('placeholder')
      store.recordEnemyDefeat(0)

      store.hardReset()

      expect(store.gold).toBe(0)
      expect(store.experience).toBe(0)
      expect(store.championUpgrades).toEqual({ damage: 0, attackSpeed: 0, hp: 0 })
      expect(store.prestigeTokens).toBe(0)
      expect(store.ladderLevel).toBe(0)
      expect(store.metaUnlocks).toEqual([{ id: 'placeholder', unlocked: false }])
      expect(
        store.enemyProgress.every((enemy) => !enemy.defeated && enemy.upgradeCount === 0),
      ).toBe(true)

      setActivePinia(createPinia())
      const reloaded = useProgressionStore()
      expect(reloaded.prestigeTokens).toBe(0)
      expect(reloaded.ladderLevel).toBe(0)
    })
  })
})
