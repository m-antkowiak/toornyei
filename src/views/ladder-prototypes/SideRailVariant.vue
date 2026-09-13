<script setup lang="ts">
import { useRunStore } from '@/stores/run'

const run = useRunStore()
</script>

<template>
  <div class="rail-page">
    <main class="ladder-main">
      <h2>Ladder</h2>
      <div class="stepper">
        <div
          v-for="(rung, index) in run.ladder"
          :key="index"
          class="step"
          :class="{
            cleared: index < run.rungIndex,
            current: index === run.rungIndex,
            locked: index > run.rungIndex,
          }"
        >
          <div class="dot">{{ index + 1 }}</div>
          <div class="line" v-if="index < run.ladder.length - 1" />
        </div>
      </div>

      <p v-if="run.isFighting" class="status">Fighting...</p>
      <p v-else-if="run.runStatus === 'victorious'" class="status">Run over — you cleared the Ladder!</p>
      <p v-else-if="run.runStatus === 'defeated'" class="status">Run over — your Champion has fallen.</p>
      <p v-else-if="run.outcome === 'champion'" class="status">Champion wins!</p>
      <p v-else-if="run.outcome === 'enemy'" class="status">Champion loses.</p>

      <button
        class="commit"
        :disabled="run.isFighting || run.runStatus !== 'active'"
        @click="run.commitToFight()"
      >
        Commit to Fight
      </button>
      <button v-if="run.runStatus !== 'active'" class="reset" @click="run.reset()">Reset</button>
    </main>

    <aside class="rail">
      <div class="panel">
        <h3>Champion</h3>
        <div class="stat-row">
          <span>HP</span>
          <div class="bar"><div class="fill" :style="{ width: (run.championHp / run.championStats.hp) * 100 + '%' }" /></div>
          <span class="value">{{ run.championHp }}/{{ run.championStats.hp }}</span>
        </div>
        <div class="stat-row"><span>Damage</span><span class="value">{{ run.championStats.damage }}</span></div>
        <div class="stat-row"><span>Attack Speed</span><span class="value">{{ run.championStats.attackSpeed }}</span></div>
        <div v-if="run.isFighting" class="stat-row">
          <span>Attack</span>
          <div class="bar atk"><div class="fill" :style="{ width: run.championAttackProgress * 100 + '%' }" /></div>
        </div>
        <div v-if="run.champion.traits.length > 0" class="traits">
          <span v-for="trait in run.champion.traits" :key="trait.stat">{{ trait.stat }} +{{ trait.amount }}</span>
        </div>
      </div>

      <div class="panel enemy">
        <h3>Enemy · Rung {{ run.rungIndex + 1 }}</h3>
        <div class="stat-row">
          <span>HP</span>
          <div class="bar"><div class="fill" :style="{ width: (run.enemyHp / run.currentEnemyStats.hp) * 100 + '%' }" /></div>
          <span class="value">{{ run.enemyHp }}/{{ run.currentEnemyStats.hp }}</span>
        </div>
        <div class="stat-row"><span>Damage</span><span class="value">{{ run.currentEnemyStats.damage }}</span></div>
        <div class="stat-row"><span>Attack Speed</span><span class="value">{{ run.currentEnemyStats.attackSpeed }}</span></div>
        <div v-if="run.isFighting" class="stat-row">
          <span>Attack</span>
          <div class="bar atk"><div class="fill" :style="{ width: run.enemyAttackProgress * 100 + '%' }" /></div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.rail-page {
  display: flex;
  gap: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 6rem;
  align-items: flex-start;
}

.ladder-main {
  flex: 1;
  min-width: 0;
}

.stepper {
  display: flex;
  align-items: center;
  margin: 1rem 0;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.step {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 2px solid var(--color-border);
  font-size: 0.8rem;
  font-weight: bold;
  flex-shrink: 0;
}

.step.cleared .dot {
  background: hsla(160, 100%, 37%, 0.2);
  border-color: hsla(160, 100%, 37%, 1);
}

.step.current .dot {
  background: rgba(179, 51, 51, 0.15);
  border-color: #b33;
  box-shadow: 0 0 0 4px rgba(179, 51, 51, 0.12);
}

.step.locked .dot {
  opacity: 0.5;
}

.line {
  width: 2rem;
  height: 2px;
  background: var(--color-border);
  flex-shrink: 0;
}

.step.cleared .line {
  background: hsla(160, 100%, 37%, 0.6);
}

.status {
  margin: 0.75rem 0;
}

.commit {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.reset {
  width: 100%;
  cursor: pointer;
}

.rail {
  width: 15rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 1.5rem;
}

.panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.9rem;
}

.panel.enemy {
  border-color: #b33;
}

.panel h3 {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 0.6rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
}

.stat-row span:first-child {
  width: 5.5rem;
  flex-shrink: 0;
  opacity: 0.7;
}

.stat-row .value {
  margin-left: auto;
  font-weight: 600;
}

.bar {
  flex: 1;
  height: 6px;
  background: var(--color-background-mute);
  border-radius: 999px;
  overflow: hidden;
}

.fill {
  height: 100%;
  background: hsla(160, 100%, 37%, 1);
}

.bar.atk {
  height: 4px;
}

.bar.atk .fill {
  transition: width 0.1s linear;
}

.panel.enemy .fill {
  background: #b33;
}

.traits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.traits span {
  background: var(--color-background-mute);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.75rem;
}

@media (max-width: 640px) {
  .rail-page {
    flex-direction: column;
  }

  .rail {
    width: 100%;
    position: static;
  }
}
</style>
