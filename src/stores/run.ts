import { reactive, ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createFight, advanceFight, type FightState, type FightOutcome } from '@/domain/fight'

const TICK_INTERVAL_MS = 100

export const useRunStore = defineStore('run', () => {
  const champion = reactive({ attackSpeed: 1, damage: 10, hp: 100 })
  const enemy = reactive({ attackSpeed: 1, damage: 8, hp: 100 })

  const fight = ref<FightState | undefined>(undefined)
  const outcome = ref<FightOutcome | undefined>(undefined)

  let intervalId: ReturnType<typeof setInterval> | undefined
  let lastTickAt = 0

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
    }
  }

  function commitToFight() {
    if (fight.value !== undefined && fight.value.outcome === undefined) return
    outcome.value = undefined
    fight.value = createFight(champion, enemy)
    lastTickAt = Date.now()
    stopTicking()
    intervalId = setInterval(tick, TICK_INTERVAL_MS)
  }

  const championHp = computed(() => fight.value?.champion.currentHp ?? champion.hp)
  const enemyHp = computed(() => fight.value?.enemy.currentHp ?? enemy.hp)
  const isFighting = computed(() => fight.value !== undefined && fight.value.outcome === undefined)

  return {
    champion,
    enemy,
    outcome,
    championHp,
    enemyHp,
    isFighting,
    commitToFight,
  }
})
