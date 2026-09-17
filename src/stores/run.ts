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
import { useProgressionStore } from '@/stores/progression'

const TICK_INTERVAL_MS = 20
const EXPERIENCE_PER_FIGHT = 10

const CHAMPION_BASE_STATS: CombatantStats = { attackSpeed: 1, damage: 20, hp: 200 }

interface LadderSeedEntry {
  baseStats: CombatantStats
  traits: Trait[]
}

const LADDER_SEED: LadderSeedEntry[] = [
  { baseStats: { attackSpeed: 1, damage: 8, hp: 100 }, traits: [{ stat: 'damage', amount: 2 }] },
  {
    baseStats: { attackSpeed: 1.1, damage: 10, hp: 120 },
    traits: [{ stat: 'attackSpeed', amount: 0.1 }],
  },
  { baseStats: { attackSpeed: 1.2, damage: 13, hp: 150 }, traits: [{ stat: 'hp', amount: 20 }] },
  { baseStats: { attackSpeed: 1.3, damage: 16, hp: 190 }, traits: [{ stat: 'damage', amount: 4 }] },
  {
    baseStats: { attackSpeed: 1.4, damage: 20, hp: 240 },
    traits: [{ stat: 'attackSpeed', amount: 0.2 }],
  },
]

export type RunStatus = 'active' | 'defeated' | 'victorious'

interface Combatant {
  baseStats: CombatantStats
  traits: Trait[]
}

function createChampion(): Combatant {
  return reactive({ baseStats: { ...CHAMPION_BASE_STATS }, traits: [] })
}

function createLadder(): Combatant[] {
  return LADDER_SEED.map((seed) =>
    reactive({ baseStats: { ...seed.baseStats }, traits: seed.traits.map((trait) => ({ ...trait })) }),
  )
}

function combatantStats(combatant: Combatant): CombatantStats {
  return applyTraits(combatant.baseStats, combatant.traits)
}

export const useRunStore = defineStore('run', () => {
  const progression = useProgressionStore()

  const champion = createChampion()
  const ladder = ref(createLadder())
  const rungIndex = ref(0)
  const runStatus = ref<RunStatus>('active')

  const fight = ref<FightState | undefined>(undefined)
  const outcome = ref<FightOutcome | undefined>(undefined)

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

  function stopTicking() {
    if (intervalId === undefined) return
    clearInterval(intervalId)
    intervalId = undefined
  }

  function resolveEcosystemFight(a: number, b: number, result: FightOutcome) {
    const winnerIndex = result === 'champion' ? a : b
    const loserIndex = result === 'champion' ? b : a
    const winner = ladder.value[winnerIndex]!
    const loser = ladder.value[loserIndex]!
    winner.traits = mergeTraitSets(winner.traits, loser.traits)
    loser.traits = []
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
    stopTicking()
    progression.grantExperience(EXPERIENCE_PER_FIGHT)

    if (result === 'enemy') {
      runStatus.value = 'defeated'
      stopEcosystemTicking()
      return
    }

    champion.traits = mergeTraitSets(champion.traits, currentEnemy.value.traits)
    if (rungIndex.value < ladder.value.length - 1) {
      rungIndex.value += 1
    } else {
      runStatus.value = 'victorious'
      stopEcosystemTicking()
    }
  }

  function tick() {
    if (!fight.value) return
    const now = Date.now()
    const elapsedMs = now - lastTickAt
    lastTickAt = now
    advanceFight(fight.value, elapsedMs)
    if (fight.value.outcome !== undefined) {
      resolveFightOutcome(fight.value.outcome)
    }
  }

  function commitToFight() {
    if (runStatus.value !== 'active') return
    if (fight.value !== undefined && fight.value.outcome === undefined) return
    outcome.value = undefined
    fight.value = createFight(championStats.value, currentEnemyStats.value)
    lastTickAt = Date.now()
    stopTicking()
    intervalId = setInterval(tick, TICK_INTERVAL_MS)
  }

  function reset() {
    if (runStatus.value === 'active') return
    stopTicking()
    ecosystemFights.clear()
    Object.assign(champion, createChampion())
    ladder.value = createLadder()
    rungIndex.value = 0
    runStatus.value = 'active'
    fight.value = undefined
    outcome.value = undefined
    startEcosystemTicking()
  }

  const championHp = computed(() => fight.value?.champion.currentHp ?? championStats.value.hp)
  const enemyHp = computed(() => fight.value?.enemy.currentHp ?? currentEnemyStats.value.hp)
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
    outcome,
    championHp,
    enemyHp,
    isFighting,
    championAttackProgress,
    enemyAttackProgress,
    commitToFight,
    reset,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRunStore, import.meta.hot))
}
