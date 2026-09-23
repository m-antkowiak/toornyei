import { reactive, ref, computed } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import {
  createFight,
  advanceFight,
  type FightState,
  type FightCombatant,
  type FightOutcome,
  type CombatantStats,
} from '@/domain/fight'
import { applyTraits } from '@/domain/trait'
import {
  createBracket,
  liveMatches,
  didResolveMatch,
  CHAMPION_SLOT,
  type Bracket,
  type BracketCombatant,
} from '@/domain/ecosystem'
import { ENEMY_CATALOG } from '@/domain/catalog'
import { experienceReward } from '@/domain/experience'
import { goldReward } from '@/domain/gold'
import { applyChampionUpgrades } from '@/domain/championUpgrade'
import { ladderLevelStats } from '@/domain/ladderLevel'
import { useProgressionStore } from '@/stores/progression'
import { useSetupStore, BRACKET_LEVELS } from '@/stores/setup'

const TICK_INTERVAL_MS = 20
const FIGHT_COOLDOWN_MS = 1000

const CHAMPION_BASE_STATS: CombatantStats = { attackSpeed: 1, damage: 20, hp: 200 }

export type RunStatus = 'setup' | 'active' | 'defeated' | 'victorious'

function createChampion(): BracketCombatant {
  return reactive({
    baseStats: { ...CHAMPION_BASE_STATS },
    traits: [],
    experienceValue: 0,
    goldValue: 0,
  })
}

function combatantStats(combatant: BracketCombatant): CombatantStats {
  return applyTraits(combatant.baseStats, combatant.traits)
}

function ecosystemFightKey(round: number, index: number): string {
  return `${round}:${index}`
}

export const useRunStore = defineStore('run', () => {
  const progression = useProgressionStore()
  const setup = useSetupStore()

  const champion = createChampion()
  const bracket = ref<Bracket | undefined>(undefined)
  const roundIndex = ref(0)
  const runStatus = ref<RunStatus>('setup')

  const fight = ref<FightState | undefined>(undefined)
  const outcome = ref<FightOutcome | undefined>(undefined)

  const isRunning = ref(false)
  const cooldownRemainingMs = ref(0)
  let intervalId: ReturnType<typeof setInterval> | undefined
  let lastTickAt = 0

  const ecosystemFights = new Map<string, FightState>()
  let ecosystemIntervalId: ReturnType<typeof setInterval> | undefined
  let lastEcosystemTickAt = 0

  function catalogIndexOfSlot(slot: number): number {
    return ENEMY_CATALOG.findIndex((type) => type.id === setup.placement[slot - 1])
  }

  function createEnemies(): BracketCombatant[] | undefined {
    const built = setup.buildCombatants()
    if (!built) return undefined
    return built.map((combatant, index) => {
      const persisted = progression.enemyProgress[catalogIndexOfSlot(index + 1)]!
      return reactive({
        baseStats: ladderLevelStats(persisted.baseStats, progression.ladderLevel),
        traits: combatant.traits,
        experienceValue: persisted.experienceValue,
        goldValue: persisted.goldValue,
      })
    })
  }

  const championStats = computed(() =>
    applyChampionUpgrades(combatantStats(champion), progression.championUpgrades),
  )
  const championMatch = computed(() =>
    bracket.value
      ? liveMatches(bracket.value).find((match) => match.first === CHAMPION_SLOT)
      : undefined,
  )
  const currentEnemy = computed(() =>
    championMatch.value ? bracket.value!.combatants[championMatch.value.second] : undefined,
  )
  const currentEnemyStats = computed(() =>
    currentEnemy.value ? combatantStats(currentEnemy.value) : undefined,
  )
  const rewardLevel = computed(() => roundIndex.value + progression.ladderLevel)
  const currentEnemyRewards = computed(() =>
    currentEnemy.value
      ? {
          experience: experienceReward(currentEnemy.value.experienceValue, rewardLevel.value),
          gold: goldReward(currentEnemy.value.goldValue, rewardLevel.value),
        }
      : undefined,
  )

  function stopTicking() {
    if (intervalId === undefined) return
    clearInterval(intervalId)
    intervalId = undefined
    isRunning.value = false
  }

  function tickEcosystem(elapsedMs: number) {
    if (!bracket.value) return
    const matches = liveMatches(bracket.value).filter((match) => match.first !== CHAMPION_SLOT)
    const liveKeys = new Set(matches.map((match) => ecosystemFightKey(match.round, match.index)))

    for (const key of ecosystemFights.keys()) {
      if (!liveKeys.has(key)) ecosystemFights.delete(key)
    }

    for (const match of matches) {
      const key = ecosystemFightKey(match.round, match.index)
      let duel = ecosystemFights.get(key)
      if (!duel) {
        duel = createFight(
          combatantStats(bracket.value.combatants[match.first]!),
          combatantStats(bracket.value.combatants[match.second]!),
        )
        ecosystemFights.set(key, duel)
      }

      advanceFight(duel, elapsedMs)
      if (duel.outcome !== undefined) {
        didResolveMatch(bracket.value, match.round, match.index, duel.outcome)
        ecosystemFights.delete(key)
      }
    }
  }

  function stopEcosystemTicking() {
    if (ecosystemIntervalId === undefined) return
    clearInterval(ecosystemIntervalId)
    ecosystemIntervalId = undefined
  }

  function startEcosystemTicking() {
    stopEcosystemTicking()
    lastEcosystemTickAt = Date.now()
    ecosystemIntervalId = setInterval(() => {
      const now = Date.now()
      const elapsedMs = now - lastEcosystemTickAt
      lastEcosystemTickAt = now
      tickEcosystem(elapsedMs)
    }, TICK_INTERVAL_MS)
  }

  function endRun(status: 'defeated' | 'victorious') {
    runStatus.value = status
    stopTicking()
    stopEcosystemTicking()
  }

  function resolveFightOutcome(result: FightOutcome) {
    outcome.value = result

    if (result === 'enemy') {
      endRun('defeated')
      return
    }

    const match = championMatch.value!
    const defeatedEnemy = bracket.value!.combatants[match.second]!
    progression.recordEnemyDefeat(catalogIndexOfSlot(match.second))
    progression.grantExperience(experienceReward(defeatedEnemy.experienceValue, rewardLevel.value))
    progression.grantGold(goldReward(defeatedEnemy.goldValue, rewardLevel.value))
    didResolveMatch(bracket.value!, match.round, match.index, 'champion')

    if (roundIndex.value < BRACKET_LEVELS - 1) {
      roundIndex.value += 1
      cooldownRemainingMs.value = FIGHT_COOLDOWN_MS
    } else {
      endRun('victorious')
    }
  }

  function didBeginFight(): boolean {
    if (!currentEnemyStats.value) return false
    outcome.value = undefined
    fight.value = createFight(championStats.value, currentEnemyStats.value)
    return true
  }

  function tick() {
    const now = Date.now()
    const elapsedMs = now - lastTickAt
    lastTickAt = now

    if (cooldownRemainingMs.value > 0) {
      cooldownRemainingMs.value -= elapsedMs
      if (cooldownRemainingMs.value <= 0) {
        cooldownRemainingMs.value = 0
        fight.value = undefined
        didBeginFight()
      }
      return
    }

    if (!fight.value) {
      didBeginFight()
      return
    }
    advanceFight(fight.value, elapsedMs)
    if (fight.value.outcome !== undefined) {
      resolveFightOutcome(fight.value.outcome)
    }
  }

  function didBeginRun(): boolean {
    const enemies = createEnemies()
    if (!enemies) return false

    stopTicking()
    stopEcosystemTicking()
    ecosystemFights.clear()
    bracket.value = createBracket([champion, ...enemies])
    roundIndex.value = 0
    cooldownRemainingMs.value = 0
    fight.value = undefined
    outcome.value = undefined
    setup.lockPlacement()
    runStatus.value = 'active'

    didBeginFight()
    lastTickAt = Date.now()
    isRunning.value = true
    intervalId = setInterval(tick, TICK_INTERVAL_MS)
    startEcosystemTicking()
    return true
  }

  function resetToSetup() {
    stopTicking()
    stopEcosystemTicking()
    ecosystemFights.clear()
    Object.assign(champion, createChampion())
    bracket.value = undefined
    roundIndex.value = 0
    cooldownRemainingMs.value = 0
    fight.value = undefined
    outcome.value = undefined
    setup.unlockPlacement()
    runStatus.value = 'setup'
  }

  function isRunOver(): boolean {
    return runStatus.value === 'defeated' || runStatus.value === 'victorious'
  }

  function commitToFight() {
    if (runStatus.value !== 'setup' || isRunning.value) return
    didBeginRun()
  }

  function restart() {
    if (!isRunOver()) return
    Object.assign(champion, createChampion())
    didBeginRun()
  }

  function edit() {
    if (!isRunOver()) return
    resetToSetup()
  }

  function prestige() {
    if (runStatus.value !== 'victorious') return
    progression.didPrestige()
    resetToSetup()
  }

  function upgradeCostOf(index: number): number {
    return progression.upgradeCostOf(index)
  }

  function didPurchaseEnemyUpgrade(index: number): boolean {
    return progression.didPurchaseEnemyUpgrade(index)
  }

  const championHp = computed(() => fight.value?.champion.currentHp ?? championStats.value.hp)
  const enemyHp = computed(() => fight.value?.enemy.currentHp ?? currentEnemyStats.value?.hp ?? 0)
  const cooldownProgress = computed(() =>
    cooldownRemainingMs.value > 0 ? 1 - cooldownRemainingMs.value / FIGHT_COOLDOWN_MS : 0,
  )
  const isFighting = computed(() => fight.value !== undefined && fight.value.outcome === undefined)
  const isAwaitingOpponent = computed(
    () =>
      runStatus.value === 'active' &&
      fight.value === undefined &&
      cooldownRemainingMs.value === 0 &&
      currentEnemy.value === undefined,
  )

  function attackProgressOf(getCombatant: () => FightCombatant | undefined) {
    return computed(() => {
      const combatant = getCombatant()
      if (!combatant) return 0
      const intervalMs = 1000 / combatant.attackSpeed
      return 1 - combatant.timeUntilNextAttackMs / intervalMs
    })
  }

  const championAttackProgress = attackProgressOf(() => fight.value?.champion)
  const enemyAttackProgress = attackProgressOf(() => fight.value?.enemy)

  return {
    champion,
    championStats,
    bracket,
    roundIndex,
    runStatus,
    currentEnemy,
    currentEnemyStats,
    currentEnemyRewards,
    outcome,
    championHp,
    enemyHp,
    isFighting,
    isRunning,
    isAwaitingOpponent,
    cooldownProgress,
    championAttackProgress,
    enemyAttackProgress,
    commitToFight,
    restart,
    edit,
    prestige,
    upgradeCostOf,
    didPurchaseEnemyUpgrade,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRunStore, import.meta.hot))
}
