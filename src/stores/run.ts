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
import { mergeTraitSets, applyTraits, type Trait } from '@/domain/trait'
import { pairUpcomingCombatants } from '@/domain/ecosystem'
import { mergeExperience, experienceReward } from '@/domain/experience'
import { mergeGold, goldReward } from '@/domain/gold'
import { upgradeStats, upgradeReward } from '@/domain/upgrade'
import { ladderLevelStats } from '@/domain/ladderLevel'
import { LADDER_SEED } from '@/domain/ladder'
import { useProgressionStore, type EnemyProgress } from '@/stores/progression'

const TICK_INTERVAL_MS = 20
const FIGHT_COOLDOWN_MS = 1000

const CHAMPION_BASE_STATS: CombatantStats = { attackSpeed: 1, damage: 20, hp: 200 }

export type RunStatus = 'active' | 'defeated' | 'victorious'

interface Combatant {
  baseStats: CombatantStats
  traits: Trait[]
  experienceValue: number
}

interface Enemy extends Combatant {
  goldValue: number
}

function createChampion(): Combatant {
  return reactive({ baseStats: { ...CHAMPION_BASE_STATS }, traits: [], experienceValue: 0 })
}

function createLadder(enemyProgress: EnemyProgress[], ladderLevel: number): Enemy[] {
  return LADDER_SEED.map((seed, index) => {
    const persisted = enemyProgress[index]!
    return reactive({
      baseStats: ladderLevelStats(persisted.baseStats, ladderLevel),
      traits: seed.traits.map((trait) => ({ ...trait })),
      experienceValue: persisted.experienceValue,
      goldValue: persisted.goldValue,
    })
  })
}

function combatantStats(combatant: Combatant): CombatantStats {
  return applyTraits(combatant.baseStats, combatant.traits)
}

export const useRunStore = defineStore('run', () => {
  const progression = useProgressionStore()

  const champion = createChampion()
  const ladder = ref(createLadder(progression.enemyProgress, progression.ladderLevel))
  const rungIndex = ref(0)
  const runStatus = ref<RunStatus>('active')

  const fight = ref<FightState | undefined>(undefined)
  const outcome = ref<FightOutcome | undefined>(undefined)

  const isRunning = ref(false)
  const cooldownRemainingMs = ref(0)
  let intervalId: ReturnType<typeof setInterval> | undefined
  let lastTickAt = 0

  const ecosystemFights = new Map<number, FightState>()
  let ecosystemIntervalId: ReturnType<typeof setInterval> | undefined
  let lastEcosystemTickAt = 0

  function statsOf(getCombatant: () => Combatant) {
    return computed(() => combatantStats(getCombatant()))
  }

  const championStats = statsOf(() => champion)
  const currentEnemy = computed(() => ladder.value[rungIndex.value]!)
  const currentEnemyStats = statsOf(() => currentEnemy.value)
  const rewardLevel = computed(() => rungIndex.value + progression.ladderLevel)
  const currentEnemyRewards = computed(() => ({
    experience: experienceReward(currentEnemy.value.experienceValue, rewardLevel.value),
    gold: goldReward(currentEnemy.value.goldValue, rewardLevel.value),
  }))

  function stopTicking() {
    if (intervalId === undefined) return
    clearInterval(intervalId)
    intervalId = undefined
    isRunning.value = false
  }

  function resolveEcosystemFight(a: number, b: number, result: FightOutcome) {
    const winnerIndex = result === 'champion' ? a : b
    const loserIndex = result === 'champion' ? b : a
    const winner = ladder.value[winnerIndex]!
    const loser = ladder.value[loserIndex]!
    winner.traits = mergeTraitSets(winner.traits, loser.traits)
    loser.traits = []
    winner.experienceValue = mergeExperience(winner.experienceValue, loser.experienceValue)
    loser.experienceValue = 0
    winner.goldValue = mergeGold(winner.goldValue, loser.goldValue)
    loser.goldValue = 0
  }

  function tickEcosystem(elapsedMs: number) {
    const pairs = pairUpcomingCombatants(ladder.value.length, rungIndex.value)
    const activeFirstIndices = new Set(pairs.map(([a]) => a))

    for (const first of ecosystemFights.keys()) {
      if (!activeFirstIndices.has(first)) ecosystemFights.delete(first)
    }

    for (const [a, b] of pairs) {
      let fight = ecosystemFights.get(a)
      if (!fight) {
        fight = createFight(combatantStats(ladder.value[a]!), combatantStats(ladder.value[b]!))
        ecosystemFights.set(a, fight)
      }

      advanceFight(fight, elapsedMs)
      if (fight.outcome !== undefined) {
        resolveEcosystemFight(a, b, fight.outcome)
        ecosystemFights.delete(a)
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

  function resolveFightOutcome(result: FightOutcome) {
    outcome.value = result

    if (result === 'enemy') {
      runStatus.value = 'defeated'
      stopEcosystemTicking()
      cooldownRemainingMs.value = FIGHT_COOLDOWN_MS
      return
    }

    const defeatedEnemy = currentEnemy.value
    progression.recordEnemyDefeat(rungIndex.value)
    progression.grantExperience(experienceReward(defeatedEnemy.experienceValue, rewardLevel.value))
    progression.grantGold(goldReward(defeatedEnemy.goldValue, rewardLevel.value))
    champion.traits = mergeTraitSets(champion.traits, defeatedEnemy.traits)
    if (rungIndex.value < ladder.value.length - 1) {
      rungIndex.value += 1
      cooldownRemainingMs.value = FIGHT_COOLDOWN_MS
    } else {
      runStatus.value = 'victorious'
      stopTicking()
      stopEcosystemTicking()
    }
  }

  function beginFight() {
    outcome.value = undefined
    fight.value = createFight(championStats.value, currentEnemyStats.value)
  }

  function finishCooldown() {
    if (runStatus.value === 'defeated') {
      restart()
      return
    }
    beginFight()
  }

  function tick() {
    const now = Date.now()
    const elapsedMs = now - lastTickAt
    lastTickAt = now

    if (cooldownRemainingMs.value > 0) {
      cooldownRemainingMs.value -= elapsedMs
      if (cooldownRemainingMs.value <= 0) {
        cooldownRemainingMs.value = 0
        finishCooldown()
      }
      return
    }

    if (!fight.value) return
    advanceFight(fight.value, elapsedMs)
    if (fight.value.outcome !== undefined) {
      resolveFightOutcome(fight.value.outcome)
    }
  }

  function commitToFight() {
    if (runStatus.value !== 'active' || isRunning.value) return
    beginFight()
    lastTickAt = Date.now()
    stopTicking()
    isRunning.value = true
    intervalId = setInterval(tick, TICK_INTERVAL_MS)
  }

  function restart() {
    stopTicking()
    cooldownRemainingMs.value = 0
    ecosystemFights.clear()
    Object.assign(champion, createChampion())
    ladder.value = createLadder(progression.enemyProgress, progression.ladderLevel)
    rungIndex.value = 0
    runStatus.value = 'active'
    fight.value = undefined
    outcome.value = undefined
    startEcosystemTicking()
  }

  function prestige() {
    if (runStatus.value !== 'victorious') return
    progression.didPrestige()
    restart()
  }

  function upgradeCostOf(index: number): number {
    return progression.upgradeCostOf(index)
  }

  function didPurchaseEnemyUpgrade(index: number): boolean {
    if (!progression.didPurchaseEnemyUpgrade(index)) return false

    const enemy = ladder.value[index]!
    enemy.baseStats = upgradeStats(enemy.baseStats)
    enemy.goldValue = upgradeReward(enemy.goldValue)
    enemy.experienceValue = upgradeReward(enemy.experienceValue)
    return true
  }

  const championHp = computed(() => fight.value?.champion.currentHp ?? championStats.value.hp)
  const enemyHp = computed(() => fight.value?.enemy.currentHp ?? currentEnemyStats.value.hp)
  const cooldownProgress = computed(() =>
    cooldownRemainingMs.value > 0 ? 1 - cooldownRemainingMs.value / FIGHT_COOLDOWN_MS : 0,
  )
  const isFighting = computed(() => fight.value !== undefined && fight.value.outcome === undefined)

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

  startEcosystemTicking()

  return {
    champion,
    championStats,
    ladder,
    rungIndex,
    runStatus,
    currentEnemy,
    currentEnemyStats,
    currentEnemyRewards,
    outcome,
    championHp,
    enemyHp,
    isFighting,
    isRunning,
    cooldownProgress,
    championAttackProgress,
    enemyAttackProgress,
    commitToFight,
    prestige,
    upgradeCostOf,
    didPurchaseEnemyUpgrade,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRunStore, import.meta.hot))
}
