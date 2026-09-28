<script setup lang="ts">
import { computed } from 'vue'
import { VueFlow, type Edge, type Node } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import { useRunStore } from '@/stores/run'
import { useSetupStore, BRACKET_LEVELS } from '@/stores/setup'
import { findEnemyType } from '@/domain/catalog'
import { CHAMPION_SLOT, bracketRoundSizes, type BracketMatch } from '@/domain/ecosystem'

type NodeStatus =
  | 'champion'
  | 'current-opponent'
  | 'live'
  | 'advanced'
  | 'eliminated'
  | 'pending'
  | 'empty'

interface BracketNodeData {
  label: string
  icon: string
  status: NodeStatus
}

const run = useRunStore()
const setup = useSetupStore()

const roundSizes = bracketRoundSizes(BRACKET_LEVELS)
const COLUMN_GAP = 240
const ROW_HEIGHT = 72

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

function isInMatch(matches: BracketMatch[], round: number, slot: number): boolean {
  return matches.some((match) => match.round === round && (match.first === slot || match.second === slot))
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
  if (run.currentEnemy && run.bracket?.combatants[slot] === run.currentEnemy) return 'current-opponent'
  if (isInMatch(run.liveEnemyMatches, round, slot)) return 'live'

  const advanced = didAdvance(round, position, slot)
  if (advanced === true) return 'advanced'
  if (advanced === false) return 'eliminated'
  return 'pending'
}

function nodeId(round: number, position: number): string {
  return `${round}:${position}`
}

const nodes = computed<Node<BracketNodeData>[]>(() => {
  const built: Node<BracketNodeData>[] = []
  for (const [round, size] of roundSizes.entries()) {
    const columnHeight = size * ROW_HEIGHT
    for (let position = 0; position < size; position++) {
      const slot = slotAt(round, position)
      const status = statusFor(round, position, slot)
      built.push({
        id: nodeId(round, position),
        type: 'bracket',
        position: { x: round * COLUMN_GAP, y: (position + 0.5) * (columnHeight / size) },
        data: {
          label: nameForSlot(slot),
          icon: iconForSlot(slot),
          status,
        },
        draggable: false,
        connectable: false,
      })
    }
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
      })
    }
  }
  return built
})
</script>

<template>
  <div class="canvas">
    <VueFlow :nodes="nodes" :edges="edges" :nodes-draggable="false" :zoom-on-double-click="false" fit-view-on-init>
      <template #node-bracket="{ data }">
        <div class="bracket-node" :class="`status-${data.status}`">
          <span class="icon">{{ data.icon }}</span>
          <span class="label">{{ data.label }}</span>
          <span v-if="data.status === 'live'" class="live-dot" aria-label="live duel" />
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.canvas {
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 32rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
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

.live-dot {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  background: hsla(160, 100%, 37%, 1);
}
</style>
