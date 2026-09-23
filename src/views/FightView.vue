<script setup lang="ts">
import { useRunStore } from '@/stores/run'
import { useProgressionStore } from '@/stores/progression'
import { formatNumber } from '@/domain/format'

const run = useRunStore()
const progression = useProgressionStore()
</script>

<template>
  <main class="fight-layout">
    <section class="ladder-column">
      <h2>Ladder</h2>
      <ol class="stepper">
        <li
          v-for="(rung, index) in run.ladder"
          :key="index"
          class="step"
          :class="{
            cleared: index < run.rungIndex,
            current: index === run.rungIndex,
            locked: index > run.rungIndex,
          }"
          :aria-current="index === run.rungIndex ? 'step' : undefined"
        >
          <div class="dot">{{ index + 1 }}</div>
          <div v-if="index < run.ladder.length - 1" class="connector" />
        </li>
      </ol>

      <p v-if="run.isFighting" class="status">Fighting...</p>
      <p v-else-if="run.runStatus === 'victorious'" class="status">
        Run over — you cleared the Ladder!
      </p>
      <p v-else-if="run.runStatus === 'defeated'" class="status">
        Run over — your Champion has fallen.
      </p>
      <p v-else-if="run.outcome === 'champion'" class="status">Champion wins!</p>
      <p v-else-if="run.outcome === 'enemy'" class="status">Champion loses.</p>

      <button :disabled="run.isFighting || run.runStatus !== 'active'" @click="run.commitToFight()">
        Commit to Fight
      </button>
      <button v-if="run.runStatus !== 'active'" @click="run.reset()">Reset</button>

      <h2>Enemy Upgrades</h2>
      <ul class="upgrade-list">
        <li v-for="(enemy, index) in progression.enemyProgress" :key="index" class="upgrade-row">
          <span>Rung {{ index + 1 }}</span>
          <button
            :disabled="!enemy.defeated || progression.gold < run.upgradeCostOf(index)"
            @click="run.didPurchaseEnemyUpgrade(index)"
          >
            Upgrade ({{ run.upgradeCostOf(index) }}g)
          </button>
        </li>
      </ul>

      <h2>Meta Unlocks</h2>
      <ul class="upgrade-list">
        <li v-for="unlock in progression.metaUnlocks" :key="unlock.id" class="upgrade-row">
          <span>{{ unlock.id }}</span>
          <span v-if="unlock.unlocked">Unlocked</span>
          <button
            v-else
            :disabled="progression.prestigeTokens < 1"
            @click="progression.didPurchaseMetaUnlock(unlock.id)"
          >
            Unlock (1 token)
          </button>
        </li>
      </ul>
    </section>

    <aside class="stat-rail">
      <section class="panel">
        <h2>Progression</h2>
        <div class="stat-row">
          <span>Experience</span>
          <span class="value">{{ formatNumber(progression.experience) }}</span>
        </div>
        <div class="stat-row">
          <span>Gold</span>
          <span class="value">{{ formatNumber(progression.gold) }}</span>
        </div>
        <div class="stat-row">
          <span>Prestige Tokens</span>
          <span class="value">{{ formatNumber(progression.prestigeTokens) }}</span>
        </div>
        <div class="stat-row">
          <span>Ladder Level</span>
          <span class="value">{{ formatNumber(progression.ladderLevel) }}</span>
        </div>
      </section>

      <section class="panel">
        <h2>Champion</h2>
        <div class="stat-row">
          <span>HP</span>
          <div class="bar">
            <div
              class="fill"
              :style="{ width: (run.championHp / run.championStats.hp) * 100 + '%' }"
            />
          </div>
          <span class="value"
            >{{ formatNumber(run.championHp) }}/{{ formatNumber(run.championStats.hp) }}</span
          >
        </div>
        <div class="stat-row">
          <span>Damage</span>
          <span class="value">{{ formatNumber(run.championStats.damage) }}</span>
        </div>
        <div class="stat-row">
          <span>Attack Speed</span>
          <span class="value">{{ formatNumber(run.championStats.attackSpeed) }}</span>
        </div>
        <div v-if="run.isFighting" class="stat-row">
          <span>Attack</span>
          <div class="bar atk">
            <div class="fill" :style="{ width: run.championAttackProgress * 100 + '%' }" />
          </div>
        </div>
        <div v-if="run.champion.traits.length > 0" class="traits">
          <span v-for="trait in run.champion.traits" :key="trait.stat"
            >{{ trait.stat }} +{{ trait.amount }}</span
          >
        </div>
      </section>

      <section class="panel enemy">
        <h2>Enemy · Rung {{ run.rungIndex + 1 }}</h2>
        <div class="stat-row">
          <span>HP</span>
          <div class="bar">
            <div
              class="fill"
              :style="{ width: (run.enemyHp / run.currentEnemyStats.hp) * 100 + '%' }"
            />
          </div>
          <span class="value"
            >{{ formatNumber(run.enemyHp) }}/{{ formatNumber(run.currentEnemyStats.hp) }}</span
          >
        </div>
        <div class="stat-row">
          <span>Damage</span>
          <span class="value">{{ formatNumber(run.currentEnemyStats.damage) }}</span>
        </div>
        <div class="stat-row">
          <span>Attack Speed</span>
          <span class="value">{{ formatNumber(run.currentEnemyStats.attackSpeed) }}</span>
        </div>
        <div v-if="run.isFighting" class="stat-row">
          <span>Attack</span>
          <div class="bar atk">
            <div class="fill" :style="{ width: run.enemyAttackProgress * 100 + '%' }" />
          </div>
        </div>
        <div v-if="run.currentEnemy.traits.length > 0" class="traits">
          <span v-for="trait in run.currentEnemy.traits" :key="trait.stat"
            >{{ trait.stat }} +{{ trait.amount }}</span
          >
        </div>
        <div class="traits">
          <span>exp +{{ run.currentEnemyRewards.experience }}</span>
          <span>gold +{{ run.currentEnemyRewards.gold }}</span>
        </div>
      </section>
    </aside>
  </main>
</template>

<style scoped>
.fight-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.ladder-column {
  flex: 1;
  min-width: 0;
}

.stepper {
  display: flex;
  align-items: center;
  margin: 1rem 0;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  list-style: none;
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

.connector {
  width: 2rem;
  height: 2px;
  background: var(--color-border);
  flex-shrink: 0;
}

.step.cleared .connector {
  background: hsla(160, 100%, 37%, 0.6);
}

.status {
  margin: 0.75rem 0;
}

.upgrade-list {
  list-style: none;
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.upgrade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.stat-rail {
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

.panel h2 {
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

.bar.atk {
  height: 4px;
}

.fill {
  height: 100%;
  background: hsla(160, 100%, 37%, 1);
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
  .fight-layout {
    flex-direction: column;
  }

  .stat-rail {
    width: 100%;
    position: static;
  }
}
</style>
