import { reactive, ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createFight, advanceFight, type FightState, type FightOutcome } from '@/domain/fight'

const TICK_INTERVAL_MS = 100

function createLadder() {
  return [
    { attackSpeed: 1, damage: 8, hp: 100 },
    { attackSpeed: 1.1, damage: 10, hp: 120 },
    { attackSpeed: 1.2, damage: 13, hp: 150 },
    { attackSpeed: 1.3, damage: 16, hp: 190 },
    { attackSpeed: 1.4, damage: 20, hp: 240 },
  ].map((stats) => reactive(stats))
}

export const useRunStore = defineStore('run', () => {
  const champion = reactive({ attackSpeed: 1, damage: 10, hp: 100 })
  const ladder = createLadder()
  const rungIndex = ref(0)

  const fight = ref<FightState | undefined>(undefined)
  const outcome = ref<FightOutcome | undefined>(undefined)

  let intervalId: ReturnType<typeof setInterval> | undefined
  let lastTickAt = 0

  const currentEnemy = computed(() => ladder[rungIndex.value]!)

  function stopTicking() {
    if (intervalId === undefined) return
    clearInterval(intervalId)
    intervalId = undefined
  }

  function tick() {
    if (!fight.value) return
    const now = Date.now()
    const elapsedMs = now - lastTickAt
    lastTickAt = now
    advanceFight(fight.value, elapsedMs)
    if (fight.value.outcome !== undefined) {
      outcome.value = fight.value.outcome
      stopTicking()
      if (outcome.value === 'champion' && rungIndex.value < ladder.length - 1) {
        rungIndex.value += 1
      }
    }
  }

  function commitToFight() {
    if (fight.value !== undefined && fight.value.outcome === undefined) return
    outcome.value = undefined
    fight.value = createFight(champion, currentEnemy.value)
    lastTickAt = Date.now()
    stopTicking()
    intervalId = setInterval(tick, TICK_INTERVAL_MS)
  }

  const championHp = computed(() => fight.value?.champion.currentHp ?? champion.hp)
  const enemyHp = computed(() => fight.value?.enemy.currentHp ?? currentEnemy.value.hp)
  const isFighting = computed(() => fight.value !== undefined && fight.value.outcome === undefined)

  return {
    champion,
    ladder,
    rungIndex,
    currentEnemy,
    outcome,
    championHp,
    enemyHp,
    isFighting,
    commitToFight,
  }
})
