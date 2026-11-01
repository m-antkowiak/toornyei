<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Handle, Position, VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import { useRunStore } from '@/stores/run'
import { useSetupStore, BRACKET_LEVELS } from '@/stores/setup'
import { ENEMY_CATALOG, findEnemyType } from '@/domain/catalog'
import { formatNumber } from '@/domain/format'
import { CHAMPION_SLOT, bracketRoundSizes, winsOf, type BracketCombatant } from '@/domain/ecosystem'
import type { Trait } from '@/domain/trait'
import { bracketNodePositions } from '@/domain/bracketLayout'
import { useMatchModifierStore } from '@/stores/matchModifier'
import { describeEffect, MODIFIER_DRAG_MIME, type MatchPosition } from '@/domain/matchModifier'
import { initialFraming, nextFraming, type CanvasFramingEvent } from '@/domain/canvasFraming'

type NodeStatus = 'champion' | 'current-opponent' | 'advanced' | 'eliminated' | 'pending' | 'empty'

interface NodeStats {
  hp: number
  damage: number
  attackSpeed: number
  traits: Trait[]
}

interface NodeWin {
  round: number
  defeatedName: string
  absorbedTraits: Trait[]
}

interface BracketNodeData {
  label: string
  icon: string
  status: NodeStatus
  stats: NodeStats | undefined
  wins: NodeWin[]
  isHistoryOpen: boolean
  enemySlot: number | undefined
  currentTypeId: string | undefined
  isPickerOpen: boolean
  matchPosition: MatchPosition | undefined
}

interface FrameNodeData extends MatchNodeData {
  isEmptyInSetup: boolean
}

interface MatchNodeData {
  matchPosition: MatchPosition
  modifierName: string | undefined
  modifierEffects: string[]
}

type CanvasNodeData = BracketNodeData | MatchNodeData | FrameNodeData

const run = useRunStore()
const setup = useSetupStore()
const modifiers = useMatchModifierStore()

const roundSizes = bracketRoundSizes(BRACKET_LEVELS)
const COLUMN_GAP = 240
const ROW_HEIGHT = 120

function slotAt(round: number, position: number): number | undefined {
  if (round === 0) return position
  return run.bracket?.rounds[round]?.[position]
}

function nameForSlot(slot: number | undefined): string {
  if (slot === undefined) return 'TBD'
  if (slot === CHAMPION_SLOT) return 'Champion'
  const typeId = setup.placement[slot - 1]
  const type = typeId ? findEnemyType(typeId) : undefined
  return type?.name ?? 'Empty'
}

function iconForSlot(slot: number | undefined): string {
  if (slot === undefined) return '?'
  if (slot === CHAMPION_SLOT) return '♛'
  const typeId = setup.placement[slot - 1]
  const type = typeId ? findEnemyType(typeId) : undefined
  return type ? type.name.charAt(0).toUpperCase() : '·'
}

function statsForSlot(slot: number | undefined): NodeStats | undefined {
  if (slot === undefined) return undefined
  const combatant: BracketCombatant | undefined = run.bracket?.combatants[slot]
  if (combatant) {
    return {
      hp: combatant.baseStats.hp,
      damage: combatant.baseStats.damage,
      attackSpeed: combatant.baseStats.attackSpeed,
      traits: combatant.traits,
    }
  }
  if (slot === CHAMPION_SLOT) return undefined
  const typeId = setup.placement[slot - 1]
  const type = typeId ? findEnemyType(typeId) : undefined
  if (!type) return undefined
  return { ...type.baseStats, traits: [type.trait] }
}

function winsForSlot(slot: number | undefined): NodeWin[] {
  if (slot === undefined || !run.bracket) return []
  return winsOf(run.bracket, slot).map((win) => ({
    round: win.round,
    defeatedName: nameForSlot(win.defeatedSlot),
    absorbedTraits: win.absorbedTraits,
  }))
}

function didAdvance(round: number, position: number, slot: number): boolean | undefined {
  const nextRound = run.bracket?.rounds[round + 1]
  if (!nextRound) return undefined
  const advanced = nextRound[Math.floor(position / 2)]
  if (advanced === undefined) return undefined
  return advanced === slot
}

function statusFor(round: number, position: number, slot: number | undefined): NodeStatus {
  if (slot === undefined) return round === 0 ? 'empty' : 'pending'
  if (slot === CHAMPION_SLOT) return 'champion'
  if (run.currentEnemy && run.bracket?.combatants[slot] === run.currentEnemy)
    return 'current-opponent'

  const advanced = didAdvance(round, position, slot)
  if (advanced === true) return 'advanced'
  if (advanced === false) return 'eliminated'
  return 'pending'
}

function nodeId(round: number, position: number): string {
  return [round, position].join(':')
}

function matchNodeId(match: MatchPosition): string {
  return ['frame', match.round, match.index].join(':')
}

const openEnemySlot = ref<number>()
const openHistoryNode = ref<string>()
const isSetupMode = computed(() => run.runStatus === 'setup')
const isPlacementOpen = computed(() => run.runStatus === 'setup' && !setup.isLocked)

function enemySlotAt(round: number, position: number): number | undefined {
  return round === 0 && position !== CHAMPION_SLOT ? position - 1 : undefined
}

function isPlacedAt(match: MatchPosition | undefined): boolean {
  const placed = modifiers.placedPosition
  return match !== undefined && placed?.round === match.round && placed.index === match.index
}

function modifierDataAt(match: MatchPosition | undefined) {
  const modifier = isPlacedAt(match) ? modifiers.placedModifier : undefined
  return {
    modifierName: modifier?.name,
    modifierEffects: modifier?.effects.map((effect) => describeEffect(effect)) ?? [],
  }
}

function isModifierDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(MODIFIER_DRAG_MIME) ?? false
}

function allowModifierDrop(event: DragEvent, match: MatchPosition | undefined) {
  if (match && isPlacementOpen.value && isModifierDrag(event)) event.preventDefault()
}

function dropModifier(event: DragEvent, match: MatchPosition | undefined) {
  const raw = event.dataTransfer?.getData(MODIFIER_DRAG_MIME)
  if (!match || !raw) return
  event.preventDefault()
  const dragged = JSON.parse(raw) as { from: 'offer' | 'placed'; id: string }
  if (dragged.from === 'offer') modifiers.didPlaceFromOffer(dragged.id, match)
  else modifiers.didMovePlaced(match)
}

function startBadgeDrag(event: DragEvent) {
  if (!event.dataTransfer || !isPlacementOpen.value) return
  event.dataTransfer.setData(
    MODIFIER_DRAG_MIME,
    JSON.stringify({ from: 'placed', id: modifiers.placedModifier?.id }),
  )
  event.dataTransfer.effectAllowed = 'move'
}

function choose(enemySlot: number, typeId: string) {
  if (setup.didPlaceType(enemySlot, typeId)) openEnemySlot.value = undefined
}

function clear(enemySlot: number) {
  if (setup.didClearSlot(enemySlot)) openEnemySlot.value = undefined
}

watch(isPlacementOpen, (open) => {
  if (!open) openEnemySlot.value = undefined
})

const positions = bracketNodePositions(roundSizes, COLUMN_GAP, ROW_HEIGHT)

const FRAME_PADDING = 12
const FRAME_HEADER = 30
const FRAME_WIDTH = 144 + FRAME_PADDING * 2
const ENTRANT_HEIGHT = 38 + 28

function pixels(value: number): string {
  return value.toString() + 'px'
}

function frameNodesFor(round: number, size: number): Node<CanvasNodeData>[] {
  if (round >= roundSizes.length - 1) return []
  return Array.from({ length: size / 2 }, (_, index) => {
    const matchPosition: MatchPosition = { round, index }
    const top = positions[round]![index * 2]!
    const bottom = positions[round]![index * 2 + 1]!
    const modifierData = modifierDataAt(matchPosition)
    return {
      id: matchNodeId(matchPosition),
      type: 'frame',
      position: { x: top.x - FRAME_PADDING, y: top.y - FRAME_HEADER },
      data: {
        matchPosition,
        ...modifierData,
        isEmptyInSetup: modifierData.modifierName === undefined && isPlacementOpen.value,
      },
      style: {
        width: pixels(FRAME_WIDTH),
        height: pixels(bottom.y - top.y + ENTRANT_HEIGHT + FRAME_HEADER + FRAME_PADDING),
      },
      zIndex: -1,
      draggable: false,
      connectable: false,
    }
  })
}

function entrantMatchPosition(round: number, position: number): MatchPosition | undefined {
  if (round >= roundSizes.length - 1) return undefined
  return { round, index: Math.floor(position / 2) }
}

const nodes = computed<Node<CanvasNodeData>[]>(() => {
  const built: Node<CanvasNodeData>[] = []
  for (const [round, size] of roundSizes.entries()) {
    for (let position = 0; position < size; position++) {
      const slot = slotAt(round, position)
      const status = statusFor(round, position, slot)
      const enemySlot = enemySlotAt(round, position)
      const id = nodeId(round, position)
      const wins = winsForSlot(slot)
      const stats = statsForSlot(slot)
      const isPickerOpen =
        enemySlot !== undefined && enemySlot === openEnemySlot.value && isPlacementOpen.value
      built.push({
        id,
        type: 'bracket',
        position: positions[round]![position]!,
        data: {
          label: nameForSlot(slot),
          icon: iconForSlot(slot),
          status,
          stats,
          wins,
          isHistoryOpen: wins.length > 0 && openHistoryNode.value === id,
          enemySlot,
          currentTypeId: enemySlot === undefined ? undefined : setup.placement[enemySlot],
          isPickerOpen,
          matchPosition: entrantMatchPosition(round, position),
        },
        zIndex: isPickerOpen || openHistoryNode.value === id ? 1000 : 0,
        draggable: false,
        connectable: false,
      })
    }
    built.push(...frameNodesFor(round, size))
  }
  return built
})

const edges = computed<Edge[]>(() => {
  const built: Edge[] = []
  for (let round = 0; round < roundSizes.length - 1; round++) {
    for (let position = 0; position < roundSizes[round]!; position++) {
      built.push({
        id: `${nodeId(round, position)}->${nodeId(round + 1, Math.floor(position / 2))}`,
        source: nodeId(round, position),
        target: nodeId(round + 1, Math.floor(position / 2)),
        type: 'smoothstep',
      })
    }
  }
  return built
})

const FIT_PADDING = 0.2
const FIT_DURATION = 300

const { fitView, onMoveStart, onNodesInitialized, onNodeClick, onPaneClick } = useVueFlow()
const nodesMeasured = ref(false)
const framing = ref(initialFraming)
const hasActiveRun = computed(() => run.runStatus === 'active')

function applyFrame() {
  if (!nodesMeasured.value) return
  const { frame } = framing.value
  const options = { padding: FIT_PADDING, duration: FIT_DURATION }
  if (frame.kind === 'all') {
    void nextTick(() => fitView(options))
    return
  }
  const nodes = Array.from({ length: roundSizes[frame.round] ?? 0 }, (_, position) =>
    nodeId(frame.round, position),
  )
  void nextTick(() => fitView({ ...options, nodes }))
}

function dispatch(event: CanvasFramingEvent) {
  const previous = framing.value
  framing.value = nextFraming(previous, event)
  if (
    framing.value.frame !== previous.frame ||
    event.type === 'recentered' ||
    event.type === 'fitAll'
  )
    applyFrame()
}

watch(
  () => [run.runStatus, run.roundIndex] as const,
  ([status, round]) => {
    if (status === 'setup') dispatch({ type: 'enteredSetup' })
    else if (status === 'active') dispatch({ type: 'roundStarted', round })
  },
  { immediate: true },
)

onNodesInitialized(() => {
  if (nodesMeasured.value) return
  nodesMeasured.value = true
  applyFrame()
})

onNodeClick(({ node }) => {
  if (node.type === 'frame') return
  const enemySlot = (node.data as BracketNodeData).enemySlot
  if (enemySlot !== undefined && isPlacementOpen.value) {
    openEnemySlot.value = openEnemySlot.value === enemySlot ? undefined : enemySlot
    return
  }
  openHistoryNode.value = openHistoryNode.value === node.id ? undefined : node.id
})

onPaneClick(() => {
  openEnemySlot.value = undefined
  openHistoryNode.value = undefined
})

function traitLabel(trait: Trait): string {
  return [trait.stat, '+', formatNumber(trait.amount, 2)].join(' ')
}

onMoveStart(({ event }) => {
  if (event?.sourceEvent) dispatch({ type: 'userMoved' })
})
</script>

<template>
  <div class="canvas">
    <VueFlow :nodes="nodes" :edges="edges" :nodes-draggable="false" :zoom-on-double-click="false">
      <template #node-frame="{ data }">
        <div
          class="frame-node"
          :class="{ 'has-modifier': data.modifierName }"
          @dragover="allowModifierDrop($event, data.matchPosition)"
          @drop="dropModifier($event, data.matchPosition)"
        >
          <span
            v-if="data.modifierName"
            class="modifier-badge nopan nodrag"
            :title="data.modifierEffects.join(', ')"
            :draggable="isPlacementOpen"
            @pointerdown.stop
            @mousedown.stop
            @dragstart="startBadgeDrag($event)"
          >
            {{ data.modifierName }}
            <span class="modifier-effects">{{ data.modifierEffects.join(' · ') }}</span>
          </span>
          <span v-else-if="data.isEmptyInSetup" class="frame-hint">drop modifier</span>
        </div>
      </template>
      <template #node-bracket="{ data }">
        <div
          class="bracket-node"
          :class="[
            `status-${data.status}`,
            { 'is-setup': isSetupMode, 'is-open': data.isHistoryOpen },
          ]"
          @dragover="allowModifierDrop($event, data.matchPosition)"
          @drop="dropModifier($event, data.matchPosition)"
        >
          <Handle type="target" :position="Position.Left" />
          <Handle type="source" :position="Position.Right" />
          <span class="icon">{{ data.icon }}</span>
          <span class="label">{{ data.label }}</span>
          <div v-if="data.stats" class="detail">
            HP {{ formatNumber(data.stats.hp) }} · DMG {{ formatNumber(data.stats.damage) }}
            <template v-if="data.stats.traits.length > 0">
              · {{ data.stats.traits.map(traitLabel).join(', ') }}
            </template>
          </div>
          <div v-if="data.isHistoryOpen" class="history nopan nodrag nowheel" @click.stop>
            <strong>Beat</strong>
            <div v-for="win in data.wins" :key="win.round" class="history-entry">
              Round {{ formatNumber(win.round + 1) }}: {{ win.defeatedName }}
              <span v-if="win.absorbedTraits.length > 0">
                — {{ win.absorbedTraits.map(traitLabel).join(', ') }}
              </span>
            </div>
          </div>
          <div v-if="data.isPickerOpen" class="picker nopan nodrag nowheel" @click.stop>
            <button
              v-for="type in ENEMY_CATALOG"
              :key="type.id"
              class="card"
              :class="{ current: type.id === data.currentTypeId }"
              @click="choose(data.enemySlot!, type.id)"
            >
              <span class="icon">{{ type.name.charAt(0).toUpperCase() }}</span>
              <span class="card-body">
                <strong>{{ type.name }}</strong>
                <span>
                  HP {{ formatNumber(type.baseStats.hp) }} · DMG
                  {{ formatNumber(type.baseStats.damage) }} · SPD
                  {{ formatNumber(type.baseStats.attackSpeed, 2) }}
                </span>
                <span>
                  XP {{ formatNumber(type.experienceValue) }} · Gold
                  {{ formatNumber(type.goldValue) }} · {{ type.trait.stat }} +{{
                    formatNumber(type.trait.amount, 2)
                  }}
                </span>
              </span>
            </button>
            <button v-if="data.currentTypeId" class="clear" @click="clear(data.enemySlot!)">
              Clear
            </button>
          </div>
        </div>
      </template>
    </VueFlow>
    <div class="canvas-controls">
      <button v-if="hasActiveRun" @click="dispatch({ type: 'recentered', round: run.roundIndex })">
        Recenter
      </button>
      <button @click="dispatch({ type: 'fitAll' })">Fit all</button>
    </div>
  </div>
</template>

<style scoped>
.canvas {
  user-select: none;
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 32rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.canvas-controls {
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  z-index: 5;
  display: flex;
  gap: 0.4rem;
}

.bracket-node {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 2px solid var(--color-border);
  background: var(--color-background);
  font-size: 0.75rem;
  white-space: nowrap;
  position: relative;
  width: 9rem;
}

.bracket-node :deep(.vue-flow__handle) {
  opacity: 0;
  pointer-events: none;
}

.bracket-node .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  background: var(--color-background-mute);
  font-weight: bold;
  flex-shrink: 0;
}

.detail {
  display: none;
  position: absolute;
  top: calc(100% + 0.2rem);
  left: 0;
  z-index: 2;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  font-size: 0.65rem;
}

.bracket-node.is-setup .detail,
.bracket-node:hover .detail,
.bracket-node.is-open .detail {
  display: block;
}

.frame-node {
  position: relative;
  width: 100%;
  height: 100%;
  border: 2px dashed var(--color-border);
  border-radius: 14px;
  background: hsla(0, 0%, 50%, 0.06);
}

.frame-node.has-modifier {
  border-style: solid;
  border-color: hsla(40, 90%, 45%, 1);
  background: hsla(40, 90%, 45%, 0.08);
}

.frame-node .modifier-badge {
  top: 0.35rem;
  bottom: auto;
}

.frame-hint {
  position: absolute;
  top: 0.4rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6rem;
  opacity: 0.5;
}

.modifier-badge {
  position: absolute;
  bottom: calc(100% + 0.2rem);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  background: hsla(40, 90%, 45%, 1);
  color: #111;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: grab;
  user-select: none;
  -webkit-user-drag: element;
}

.modifier-effects {
  display: none;
  position: absolute;
  top: calc(100% + 0.2rem);
  left: 0;
  padding: 0.15rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-weight: 400;
  z-index: 3;
}

.modifier-badge:hover .modifier-effects {
  display: block;
}

.history {
  position: absolute;
  top: 50%;
  left: calc(100% + 0.75rem);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 16rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  white-space: normal;
  font-size: 0.7rem;
  cursor: default;
}

.picker {
  position: absolute;
  top: 50%;
  left: calc(100% + 0.75rem);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 17rem;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  white-space: normal;
  cursor: default;
}

.card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  text-align: left;
  font-size: 0.7rem;
}

.card.current {
  border-color: hsla(160, 100%, 37%, 1);
}

.card-body {
  display: flex;
  flex-direction: column;
}

.status-champion {
  border-color: #b33;
}

.status-current-opponent {
  border-color: #b33;
}

.status-advanced {
  border-color: hsla(160, 100%, 37%, 1);
}

.status-eliminated {
  opacity: 0.4;
}

.status-pending,
.status-empty {
  border-style: dashed;
  opacity: 0.6;
}
</style>
