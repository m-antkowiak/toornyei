import { ref, reactive } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { CombatantStats } from '@/domain/fight'
import { LADDER_SEED } from '@/domain/ladder'
import { upgradeCost, upgradeStats, upgradeReward } from '@/domain/upgrade'

export interface EnemyProgress {
  baseStats: CombatantStats
  goldValue: number
  experienceValue: number
  defeated: boolean
  upgradeCount: number
}

function createEnemyProgress(): EnemyProgress[] {
  return LADDER_SEED.map((seed) =>
    reactive({
      baseStats: { ...seed.baseStats },
      goldValue: seed.goldValue,
      experienceValue: seed.experienceValue,
      defeated: false,
      upgradeCount: 0,
    }),
  )
}

export const useProgressionStore = defineStore('progression', () => {
  const experience = ref(0)
  const gold = ref(0)
  const enemyProgress = ref(createEnemyProgress())

  function grantExperience(amount: number) {
    experience.value += amount
  }

  function grantGold(amount: number) {
    gold.value += amount
  }

  function recordEnemyDefeat(index: number) {
    const enemy = enemyProgress.value[index]
    if (enemy) enemy.defeated = true
  }

  function upgradeCostOf(index: number): number {
    const enemy = enemyProgress.value[index]
    return enemy ? upgradeCost(enemy.upgradeCount) : 0
  }

  function didPurchaseEnemyUpgrade(index: number): boolean {
    const enemy = enemyProgress.value[index]
    if (!enemy || !enemy.defeated) return false

    const cost = upgradeCost(enemy.upgradeCount)
    if (gold.value < cost) return false

    gold.value -= cost
    enemy.upgradeCount += 1
    enemy.baseStats = upgradeStats(enemy.baseStats)
    enemy.goldValue = upgradeReward(enemy.goldValue)
    enemy.experienceValue = upgradeReward(enemy.experienceValue)
    return true
  }

  return {
    experience,
    gold,
    enemyProgress,
    grantExperience,
    grantGold,
    recordEnemyDefeat,
    upgradeCostOf,
    didPurchaseEnemyUpgrade,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProgressionStore, import.meta.hot))
}
