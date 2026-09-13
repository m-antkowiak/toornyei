<script setup lang="ts">
import { ref } from 'vue'
import { useRunStore } from '@/stores/run'

const run = useRunStore()
const hoveredIndex = ref<number | undefined>(undefined)

function isExpanded(index: number) {
  return index === run.rungIndex || index === hoveredIndex.value
}
</script>

<template>
  <div class="collapsed-page">
    <header class="strip">
      <span
        >Champion: {{ run.championHp }}/{{ run.championStats.hp }} HP · ⚔{{ run.championStats.damage }} · ⏱{{
          run.championStats.attackSpeed
        }}/s</span
      >
      <span v-if="run.champion.traits.length > 0" class="traits">
        <span v-for="trait in run.champion.traits" :key="trait.stat">{{ trait.stat }} +{{ trait.amount }}</span>
      </span>
      <div v-if="run.isFighting" class="atk-bar">
        <div class="atk-fill" :style="{ width: run.championAttackProgress * 100 + '%' }" />
      </div>
      <button :disabled="run.isFighting || run.runStatus !== 'active'" @click="run.commitToFight()">Commit</button>
      <button v-if="run.runStatus !== 'active'" @click="run.reset()">Reset</button>
    </header>

    <p v-if="run.isFighting" class="status">Fighting...</p>
    <p v-else-if="run.runStatus === 'victorious'" class="status">Run over — you cleared the Ladder!</p>
    <p v-else-if="run.runStatus === 'defeated'" class="status">Run over — your Champion has fallen.</p>
    <p v-else-if="run.outcome === 'champion'" class="status">Champion wins!</p>
    <p v-else-if="run.outcome === 'enemy'" class="status">Champion loses.</p>

    <div class="rungs">
      <div
        v-for="(rung, index) in run.ladder"
        :key="index"
        class="rung"
        :class="{
          cleared: index < run.rungIndex,
          current: index === run.rungIndex,
          locked: index > run.rungIndex,
          expanded: isExpanded(index),
        }"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = undefined"
      >
        <div class="rung-bar">
          <span class="badge">{{ index + 1 }}</span>
          <span class="state">
            <template v-if="index < run.rungIndex">Cleared</template>
            <template v-else-if="index === run.rungIndex">Champion here</template>
            <template v-else>Locked</template>
          </span>
          <span class="compact-stats">⚔{{ rung.baseStats.damage }} ⏱{{ rung.baseStats.attackSpeed }} ♥{{
            rung.baseStats.hp
          }}</span>
        </div>
        <div class="rung-expanded">
          <p>Attack Speed: {{ rung.baseStats.attackSpeed }}</p>
          <p>Damage: {{ rung.baseStats.damage }}</p>
          <p v-if="index === run.rungIndex">HP: {{ run.enemyHp }} / {{ rung.baseStats.hp }}</p>
          <p v-else>HP: {{ rung.baseStats.hp }}</p>
          <div v-if="index === run.rungIndex && run.isFighting" class="atk-bar">
            <div class="atk-fill enemy" :style="{ width: run.enemyAttackProgress * 100 + '%' }" />
          </div>
          <p v-if="rung.traits.length > 0" class="traits">
            <span v-for="trait in rung.traits" :key="trait.stat">{{ trait.stat }} +{{ trait.amount }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collapsed-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem 6rem;
}

.strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.strip button {
  margin-left: auto;
  cursor: pointer;
}

.strip .traits {
  display: flex;
  gap: 0.3rem;
}

.strip .traits span {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
  font-size: 0.75rem;
}

.status {
  text-align: center;
  margin-bottom: 0.75rem;
}

.atk-bar {
  width: 5rem;
  height: 4px;
  border-radius: 999px;
  background: var(--color-background-mute);
  overflow: hidden;
}

.rung-expanded .atk-bar {
  width: 100%;
  margin: 0.3rem 0;
}

.atk-fill {
  height: 100%;
  background: hsla(160, 100%, 37%, 1);
  transition: width 0.1s linear;
}

.atk-fill.enemy {
  background: #b33;
}

.rungs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.rung {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
  transition: background-color 0.15s;
}

.rung.current {
  border-color: #b33;
}

.rung.cleared {
  opacity: 0.75;
}

.rung.locked {
  opacity: 0.5;
}

.rung-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  cursor: default;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: var(--color-background-mute);
  font-size: 0.75rem;
  font-weight: bold;
  flex-shrink: 0;
}

.rung.cleared .badge {
  background: hsla(160, 100%, 37%, 0.25);
}

.rung.current .badge {
  background: rgba(179, 51, 51, 0.2);
}

.state {
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 6.5rem;
}

.compact-stats {
  margin-left: auto;
  font-size: 0.75rem;
  opacity: 0.7;
}

.rung-expanded {
  max-height: 0;
  padding: 0 0.75rem;
  font-size: 0.85rem;
  transition:
    max-height 0.2s ease,
    padding 0.2s ease;
}

.rung.expanded .rung-expanded {
  max-height: 10rem;
  padding: 0 0.75rem 0.75rem;
}

.rung-expanded .traits {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.25rem;
}

.rung-expanded .traits span {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
  font-size: 0.75rem;
}
</style>
