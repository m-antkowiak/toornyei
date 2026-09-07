import { reactive, ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createFight, advanceFight, type FightState, type FightOutcome, type CombatantStats } from '@/domain/fight'
import { mergeTraitSets, applyTraits, type Trait } from '@/domain/trait'

const TICK_INTERVAL_MS = 100

const CHAMPION_BASE_STATS: CombatantStats = { attackSpeed: 1, damage: 10, hp: 100 }

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

export const useRunStore = defineStore('run', () => {
  const champion = createChampion()
  const ladder = ref(createLadder())
  const rungIndex = ref(0)
  const runStatus = ref<RunStatus>('active')

  const fight = ref<FightState | undefined>(undefined)
  const outcome = ref<FightOutcome | undefined>(undefined)

  let intervalId: ReturnType<typeof setInterval> | undefined
  let lastTickAt = 0

  function statsOf(getCombatant: () => Combatant) {
    return computed(() => {
      const combatant = getCombatant()
      return applyTraits(combatant.baseStats, combatant.traits)
    })
  }

  const championStats = statsOf(() => champion)
  const currentEnemy = computed(() => ladder.value[rungIndex.value]!)
  const currentEnemyStats = statsOf(() => currentEnemy.value)

  function stopTicking() {
    if (intervalId === undefined) return
    clearInterval(intervalId)
    intervalId = undefined
  }

  function resolveFightOutcome(result: FightOutcome) {
    outcome.value = result
    stopTicking()

    if (result === 'enemy') {
      runStatus.value = 'defeated'
      return
    }

    champion.traits = mergeTraitSets(champion.traits, currentEnemy.value.traits)
    if (rungIndex.value < ladder.value.length - 1) {
      rungIndex.value += 1
    } else {
      runStatus.value = 'victorious'
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
    Object.assign(champion, createChampion())
    ladder.value = createLadder()
    rungIndex.value = 0
    runStatus.value = 'active'
    fight.value = undefined
    outcome.value = undefined
  }

  const championHp = computed(() => fight.value?.champion.currentHp ?? championStats.value.hp)
  const enemyHp = computed(() => fight.value?.enemy.currentHp ?? currentEnemyStats.value.hp)
  const isFighting = computed(() => fight.value !== undefined && fight.value.outcome === undefined)

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
    commitToFight,
    reset,
  }
})
