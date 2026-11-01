import { ref, computed } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'
import {
  drawModifierOffer,
  findMatchModifier,
  isMatchPositionInBracket,
  isSameMatchPosition,
  type MatchModifier,
  type MatchPosition,
  type ModifierEffect,
} from '@/domain/matchModifier'
import { useSetupStore, BRACKET_LEVELS } from '@/stores/setup'

interface PlacedModifier {
  modifierId: string
  position: MatchPosition
}

export const useMatchModifierStore = defineStore('matchModifier', () => {
  const setup = useSetupStore()

  const placed = ref<PlacedModifier>()
  const offerIds = ref<string[]>()

  const offer = computed<MatchModifier[]>(() =>
    (offerIds.value ?? []).map((id) => findMatchModifier(id)!),
  )
  const placedModifier = computed(() =>
    placed.value ? findMatchModifier(placed.value.modifierId) : undefined,
  )
  const placedPosition = computed(() => placed.value?.position)

  function canPlaceAt(position: MatchPosition): boolean {
    return !setup.isLocked && isMatchPositionInBracket(BRACKET_LEVELS, position)
  }

  function didPlaceFromOffer(modifierId: string, position: MatchPosition): boolean {
    if (!offerIds.value?.includes(modifierId) || !canPlaceAt(position)) return false
    placed.value = { modifierId, position: { round: position.round, index: position.index } }
    offerIds.value = undefined
    return true
  }

  function didMovePlaced(position: MatchPosition): boolean {
    if (!placed.value || !canPlaceAt(position)) return false
    placed.value.position = { round: position.round, index: position.index }
    return true
  }

  function didSkipOffer(): boolean {
    if (setup.isLocked || offerIds.value === undefined) return false
    offerIds.value = undefined
    return true
  }

  function drawOffer(random?: () => number) {
    offerIds.value = drawModifierOffer(random).map((modifier) => modifier.id)
  }

  function clearOffer() {
    offerIds.value = undefined
  }

  function clearPlaced() {
    placed.value = undefined
  }

  function effectsAt(position: MatchPosition): readonly ModifierEffect[] {
    if (!placed.value || !isSameMatchPosition(placed.value.position, position)) return []
    return placedModifier.value?.effects ?? []
  }

  return {
    offer,
    placedModifier,
    placedPosition,
    didPlaceFromOffer,
    didMovePlaced,
    didSkipOffer,
    drawOffer,
    clearOffer,
    clearPlaced,
    effectsAt,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMatchModifierStore, import.meta.hot))
}
