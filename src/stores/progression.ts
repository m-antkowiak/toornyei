import { ref, reactive, watch } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { CombatantStats } from '@/domain/fight'
import { LADDER_SEED } from '@/domain/ladder'
import { upgradeCost, upgradeStats, upgradeReward } from '@/domain/upgrade'
import {
  championUpgradeCost,
  createChampionUpgradeLevels,
  type ChampionUpgradeKind,
} from '@/domain/championUpgrade'

export interface MetaUnlock {
  id: string
  unlocked: boolean
}

const META_UNLOCK_COST = 1
const META_UNLOCK_IDS = ['placeholder']
const META_STORAGE_KEY = 'toornyei:meta'

interface PersistedMeta {
  prestigeTokens: number
  ladderLevel: number
  unlockedIds: string[]
}

function loadPersistedMeta(): PersistedMeta | undefined {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY)
    if (raw === null) return undefined
    const parsed = JSON.parse(raw) as PersistedMeta
    if (typeof parsed.prestigeTokens !== 'number' || typeof parsed.ladderLevel !== 'number') {
      return undefined
    }
    if (!Array.isArray(parsed.unlockedIds)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

function savePersistedMeta(meta: PersistedMeta) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta))
  } catch {
    return
  }
}

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
  const championUpgrades = ref(createChampionUpgradeLevels())
  const persistedMeta = loadPersistedMeta()
  const prestigeTokens = ref(persistedMeta?.prestigeTokens ?? 0)
  const ladderLevel = ref(persistedMeta?.ladderLevel ?? 0)
  const metaUnlocks = ref<MetaUnlock[]>(
    META_UNLOCK_IDS.map((id) => ({
      id,
      unlocked: persistedMeta?.unlockedIds.includes(id) ?? false,
    })),
  )

  watch(
    [prestigeTokens, ladderLevel, metaUnlocks],
    () =>
      savePersistedMeta({
        prestigeTokens: prestigeTokens.value,
        ladderLevel: ladderLevel.value,
        unlockedIds: metaUnlocks.value.filter((entry) => entry.unlocked).map((entry) => entry.id),
      }),
    { deep: true, flush: 'sync' },
  )
  const enemyProgress = ref(createEnemyProgress())

  function grantExperience(amount: number) {
    experience.value += amount
  }

  function grantGold(amount: number) {
    gold.value += amount
  }

  function didPrestige() {
    prestigeTokens.value += 1
    ladderLevel.value += 1
    experience.value = 0
    championUpgrades.value = createChampionUpgradeLevels()
  }

  function didPurchaseMetaUnlock(id: string): boolean {
    const unlock = metaUnlocks.value.find((entry) => entry.id === id)
    if (!unlock || unlock.unlocked) return false
    if (prestigeTokens.value < META_UNLOCK_COST) return false

    prestigeTokens.value -= META_UNLOCK_COST
    unlock.unlocked = true
    return true
  }

  function hardReset() {
    experience.value = 0
    gold.value = 0
    championUpgrades.value = createChampionUpgradeLevels()
    prestigeTokens.value = 0
    ladderLevel.value = 0
    metaUnlocks.value = META_UNLOCK_IDS.map((id) => ({ id, unlocked: false }))
    enemyProgress.value = createEnemyProgress()
  }

  function recordEnemyDefeat(index: number) {
    const enemy = enemyProgress.value[index]
    if (enemy) enemy.defeated = true
  }

  function championUpgradeCostOf(kind: ChampionUpgradeKind): number {
    return championUpgradeCost(kind, championUpgrades.value[kind])
  }

  function didPurchaseChampionUpgrade(kind: ChampionUpgradeKind): boolean {
    const cost = championUpgradeCostOf(kind)
    if (experience.value < cost) return false

    experience.value -= cost
    championUpgrades.value[kind] += 1
    return true
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
    championUpgrades,
    prestigeTokens,
    ladderLevel,
    metaUnlocks,
    enemyProgress,
    grantExperience,
    grantGold,
    didPrestige,
    hardReset,
    didPurchaseMetaUnlock,
    recordEnemyDefeat,
    upgradeCostOf,
    didPurchaseEnemyUpgrade,
    championUpgradeCostOf,
    didPurchaseChampionUpgrade,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProgressionStore, import.meta.hot))
}
