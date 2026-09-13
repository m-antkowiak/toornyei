<script setup lang="ts">
import { useRunStore } from '@/stores/run'

const run = useRunStore()
</script>

<template>
  <div class="bracket-page">
    <div class="matchup">
      <div class="fighter-card">
        <h3>Champion</h3>
        <p class="hp">{{ run.championHp }} / {{ run.championStats.hp }} HP</p>
        <p>⚔ {{ run.championStats.damage }} · ⏱ {{ run.championStats.attackSpeed }}/s</p>
        <div v-if="run.isFighting" class="atk-bar">
          <div class="atk-fill" :style="{ width: run.championAttackProgress * 100 + '%' }" />
        </div>
        <p v-if="run.champion.traits.length > 0" class="traits">
          <span v-for="trait in run.champion.traits" :key="trait.stat">{{ trait.stat }} +{{ trait.amount }}</span>
        </p>
      </div>
      <div class="vs">VS</div>
      <div class="fighter-card enemy">
        <h3>Enemy · Rung {{ run.rungIndex + 1 }}</h3>
        <p class="hp">{{ run.enemyHp }} / {{ run.currentEnemyStats.hp }} HP</p>
        <p>⚔ {{ run.currentEnemyStats.damage }} · ⏱ {{ run.currentEnemyStats.attackSpeed }}/s</p>
        <div v-if="run.isFighting" class="atk-bar">
          <div class="atk-fill enemy" :style="{ width: run.enemyAttackProgress * 100 + '%' }" />
        </div>
      </div>
    </div>

    <button
      class="commit"
      :disabled="run.isFighting || run.runStatus !== 'active'"
      @click="run.commitToFight()"
    >
      Commit to Fight
    </button>

    <p v-if="run.isFighting" class="status">Fighting...</p>
    <p v-else-if="run.runStatus === 'victorious'" class="status">Run over — you cleared the Ladder!</p>
    <p v-else-if="run.runStatus === 'defeated'" class="status">Run over — your Champion has fallen.</p>
    <p v-else-if="run.outcome === 'champion'" class="status">Champion wins!</p>
    <p v-else-if="run.outcome === 'enemy'" class="status">Champion loses.</p>

    <button v-if="run.runStatus !== 'active'" class="reset" @click="run.reset()">Reset</button>

    <h2 class="ladder-heading">Ladder</h2>
    <div class="tree">
      <div
        v-for="(rung, index) in run.ladder"
        :key="index"
        class="node"
        :class="{
          cleared: index < run.rungIndex,
          current: index === run.rungIndex,
          locked: index > run.rungIndex,
        }"
      >
        <div class="connector" v-if="index > 0" />
        <div class="pill">
          <span class="index">{{ index + 1 }}</span>
          <span v-if="index < run.rungIndex" class="mark">✓</span>
          <span v-else-if="index > run.rungIndex" class="mark">🔒</span>
        </div>
        <div v-if="index === run.rungIndex" class="detail">
          <strong>Champion is here</strong>
          <span>⚔ {{ rung.baseStats.damage }} · ⏱ {{ rung.baseStats.attackSpeed }}/s · ♥ {{ rung.baseStats.hp }}</span>
        </div>
        <div v-else class="detail collapsed">
          <span>⚔ {{ rung.baseStats.damage }} · ⏱ {{ rung.baseStats.attackSpeed }}/s · ♥ {{ rung.baseStats.hp }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bracket-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem 6rem;
}

.matchup {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.fighter-card {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.fighter-card.enemy {
  border-color: #b33;
}

.fighter-card h3 {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.7;
}

.hp {
  font-weight: bold;
}

.atk-bar {
  height: 4px;
  border-radius: 999px;
  background: var(--color-background-mute);
  overflow: hidden;
  margin-top: 0.4rem;
}

.atk-fill {
  height: 100%;
  background: hsla(160, 100%, 37%, 1);
  transition: width 0.1s linear;
}

.atk-fill.enemy {
  background: #b33;
}

.traits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.traits span {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
}

.vs {
  font-weight: bold;
  opacity: 0.5;
}

.commit {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.status {
  text-align: center;
  margin: 0.5rem 0;
}

.reset {
  width: 100%;
  margin-bottom: 1.5rem;
  cursor: pointer;
}

.ladder-heading {
  margin-bottom: 1rem;
}

.tree {
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
}

.node {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.connector {
  width: 2px;
  height: 1.5rem;
  background: var(--color-border);
}

.node.cleared .connector {
  background: hsla(160, 100%, 37%, 0.6);
}

.pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  border: 2px solid var(--color-border);
  font-weight: bold;
  flex-shrink: 0;
}

.node.cleared .pill {
  border-color: hsla(160, 100%, 37%, 1);
  background: hsla(160, 100%, 37%, 0.15);
}

.node.current .pill {
  border-color: #b33;
  background: rgba(179, 51, 51, 0.12);
  box-shadow: 0 0 0 4px rgba(179, 51, 51, 0.15);
}

.node.locked .pill {
  opacity: 0.5;
}

.detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.15rem;
  margin: 0.4rem 0 0.9rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.node.current .detail {
  background: var(--color-background-soft);
  border: 1px solid #b33;
}

.detail.collapsed {
  opacity: 0.6;
  font-size: 0.75rem;
}
</style>
