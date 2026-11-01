import { ref, reactive, watch } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import type { CombatantStats } from '@/domain/fight'
import { ENEMY_CATALOG } from '@/domain/catalog'
import { upgradeCost, upgradeStats, upgradeReward } from '@/domain/upgrade'
import type { FightTally } from '@/domain/fight'
import {
  accumulatePassiveExp,
  createPassiveGrowthState,
  hasPassiveSource,
  PASSIVE_GROWTH_RULES,
  type PassiveGrowthState,
} from '@/domain/passiveGrowth'
import {
  championUpgradeCost,
  CHAMPION_UPGRADE_KINDS,
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

const PASSIVE_STORAGE_KEY = 'toornyei:passive'

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function loadPassiveGrowth(): PassiveGrowthState {
  const state = createPassiveGrowthState()
  try {
    const raw = localStorage.getItem(PASSIVE_STORAGE_KEY)
    if (raw === null) return state
    const parsed = JSON.parse(raw) as Partial<
      Record<ChampionUpgradeKind, { unlocked?: unknown; exp?: unknown; level?: unknown }>
    > | null
    if (!parsed) return state
    for (const kind of CHAMPION_UPGRADE_KINDS) {
      const stored = parsed[kind]
      if (!stored) continue
      if (typeof stored.unlocked === 'boolean') state[kind].unlocked = stored.unlocked
      if (isNonNegativeNumber(stored.exp)) state[kind].exp = stored.exp
      if (isNonNegativeNumber(stored.level)) state[kind].level = Math.floor(stored.level)
    }
    return state
  } catch {
    return createPassiveGrowthState()
  }
}

function savePassiveGrowth(state: PassiveGrowthState) {
  try {
    localStorage.setItem(PASSIVE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    return
  }
}

function passiveUnlockCostOf(kind: ChampionUpgradeKind): number {
  return PASSIVE_GROWTH_RULES[kind].unlockCost
}

export interface EnemyProgress {
  baseStats: CombatantStats
  goldValue: number
  experienceValue: number
  defeated: boolean
  upgradeCount: number
}

function createEnemyProgress(): EnemyProgress[] {
  return ENEMY_CATALOG.map((type) =>
    reactive({
      baseStats: { ...type.baseStats },
      goldValue: type.goldValue,
      experienceValue: type.experienceValue,
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
  const passiveGrowth = ref(loadPassiveGrowth())

  watch(passiveGrowth, (state) => savePassiveGrowth(state), { deep: true, flush: 'sync' })

  function grantPassiveActions(tally: FightTally) {
    accumulatePassiveExp(passiveGrowth.value, tally)
  }

  function didUnlockPassive(kind: ChampionUpgradeKind): boolean {
    const stat = passiveGrowth.value[kind]
    if (stat.unlocked || !hasPassiveSource(kind)) return false
    const cost = passiveUnlockCostOf(kind)
    if (experience.value < cost) return false

    experience.value -= cost
    stat.unlocked = true
    return true
  }

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
    passiveGrowth.value = createPassiveGrowthState()
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
    passiveGrowth.value = createPassiveGrowthState()
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
    passiveGrowth,
    grantPassiveActions,
    passiveUnlockCostOf,
    didUnlockPassive,
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
