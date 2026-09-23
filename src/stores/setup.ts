import { ref, computed, watch } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import { findEnemyType, createBracketCombatant } from '@/domain/catalog'
import { bracketSize, type BracketCombatant } from '@/domain/ecosystem'

export const BRACKET_LEVELS = 4
export const ENEMY_SLOT_COUNT = bracketSize(BRACKET_LEVELS) - 1

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

function isSlotInBracket(slot: number): boolean {
  return Number.isSafeInteger(slot) && slot >= 0 && slot < ENEMY_SLOT_COUNT
}

function createEmptyPlacement(): Placement {
  return Array.from<string | undefined>({ length: ENEMY_SLOT_COUNT })
}

function parsePlacement(raw: unknown): Placement | undefined {
  if (!Array.isArray(raw) || raw.length !== ENEMY_SLOT_COUNT) return undefined
  const placement = createEmptyPlacement()
  for (let slot = 0; slot < ENEMY_SLOT_COUNT; slot++) {
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

  function didPlaceType(slot: number, typeId: string): boolean {
    if (isLocked.value || !isSlotInBracket(slot) || !findEnemyType(typeId)) return false
    placement.value[slot] = typeId
    return true
  }

  function didClearSlot(slot: number): boolean {
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

  function didSaveSetup(name: string): boolean {
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

  function didLoadSetup(name: string): boolean {
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
    didPlaceType,
    didClearSlot,
    lockPlacement,
    unlockPlacement,
    buildCombatants,
    didSaveSetup,
    didLoadSetup,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSetupStore, import.meta.hot))
}
