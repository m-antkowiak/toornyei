import { ref, computed, watch } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { findEnemyType, createBracketCombatant } from '@/domain/catalog'
import type { BracketCombatant } from '@/domain/ecosystem'

export const BRACKET_SIZE = 16

const SETUPS_STORAGE_KEY = 'toornyei:setups'

export type Placement = Array<string | undefined>

export interface SavedSetup {
  name: string
  placement: Placement
}

interface StoredSetup {
  name?: unknown
  placement?: unknown
}

function createEmptyPlacement(): Placement {
  return Array.from<string | undefined>({ length: BRACKET_SIZE })
}

function parsePlacement(raw: unknown): Placement | undefined {
  if (!Array.isArray(raw) || raw.length !== BRACKET_SIZE) return undefined
  const placement = createEmptyPlacement()
  for (let slot = 0; slot < BRACKET_SIZE; slot++) {
    const entry: unknown = raw[slot]
    if (entry !== null && typeof entry !== 'string') return undefined
    placement[slot] = typeof entry === 'string' && findEnemyType(entry) ? entry : undefined
  }
  return placement
}

function loadSavedSetups(): SavedSetup[] {
  try {
    const raw = localStorage.getItem(SETUPS_STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const setups: SavedSetup[] = []
    for (const entry of parsed as Array<StoredSetup | null>) {
      if (!entry || typeof entry.name !== 'string') continue
      const placement = parsePlacement(entry.placement)
      if (placement) setups.push({ name: entry.name, placement })
    }
    return setups
  } catch {
    return []
  }
}

function persistSavedSetups(setups: SavedSetup[]) {
  try {
    localStorage.setItem(SETUPS_STORAGE_KEY, JSON.stringify(setups))
  } catch {
    return
  }
}

export const useSetupStore = defineStore('setup', () => {
  const placement = ref<Placement>(createEmptyPlacement())
  const isLocked = ref(false)
  const savedSetups = ref<SavedSetup[]>(loadSavedSetups())

  watch(savedSetups, (setups) => persistSavedSetups(setups), { deep: true, flush: 'sync' })

  const isComplete = computed(() => placement.value.every((slot) => slot !== undefined))

  function isSlotInBracket(slot: number): boolean {
    return Number.isInteger(slot) && slot >= 0 && slot < BRACKET_SIZE
  }

  function placeType(slot: number, typeId: string): boolean {
    if (isLocked.value || !isSlotInBracket(slot) || !findEnemyType(typeId)) return false
    placement.value[slot] = typeId
    return true
  }

  function clearSlot(slot: number): boolean {
    if (isLocked.value || !isSlotInBracket(slot)) return false
    placement.value[slot] = undefined
    return true
  }

  function lockPlacement() {
    isLocked.value = true
  }

  function unlockPlacement() {
    isLocked.value = false
  }

  function buildCombatants(): BracketCombatant[] | undefined {
    if (!isComplete.value) return undefined
    return placement.value.map((typeId) => createBracketCombatant(findEnemyType(typeId!)!))
  }

  function saveSetup(name: string): boolean {
    const trimmed = name.trim()
    if (trimmed === '') return false

    const saved: SavedSetup = { name: trimmed, placement: [...placement.value] }
    const existing = savedSetups.value.findIndex((setup) => setup.name === trimmed)
    if (existing === -1) {
      savedSetups.value.push(saved)
    } else {
      savedSetups.value[existing] = saved
    }
    return true
  }

  function loadSetup(name: string): boolean {
    if (isLocked.value) return false
    const setup = savedSetups.value.find((entry) => entry.name === name)
    if (!setup) return false
    placement.value = [...setup.placement]
    return true
  }

  return {
    placement,
    isLocked,
    isComplete,
    savedSetups,
    placeType,
    clearSlot,
    lockPlacement,
    unlockPlacement,
    buildCombatants,
    saveSetup,
    loadSetup,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSetupStore, import.meta.hot))
}
