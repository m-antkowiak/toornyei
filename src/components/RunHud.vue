<script setup lang="ts">
import { useRunStore } from '@/stores/run'
import { useProgressionStore } from '@/stores/progression'
import { formatNumber } from '@/domain/format'
import { CHAMPION_UPGRADE_KINDS, type ChampionUpgradeKind } from '@/domain/championUpgrade'

const run = useRunStore()
const progression = useProgressionStore()
const isDevelopment = import.meta.env.DEV

const championUpgradeLabels: Record<ChampionUpgradeKind, string> = {
  damage: 'Damage',
  attackSpeed: 'Attack Speed',
  hp: 'HP',
}

function hardReset() {
  progression.hardReset()
  globalThis.location.reload()
}
</script>

<template>
  <aside class="hud">
    <section class="panel">
      <h2>Status</h2>
      <p v-if="run.isFighting" class="status">Fighting...</p>
      <p v-else-if="run.runStatus === 'victorious'" class="status">
        You cleared the Bracket! Restart, Edit your setup, or Prestige.
      </p>
      <p v-else-if="run.runStatus === 'defeated'" class="status">
        Your Champion has fallen. Restart or Edit your setup.
      </p>
      <p v-else-if="run.isAwaitingOpponent" class="status">Awaiting the next opponent...</p>
      <p v-else-if="run.outcome === 'champion'" class="status">Champion wins!</p>
      <div v-if="run.runStatus === 'active'" class="stat-row">
        <span>Round</span>
        <span class="value">{{ formatNumber(run.roundIndex + 1) }}</span>
      </div>
      <div v-if="run.cooldownProgress > 0" class="stat-row cooldown">
        <span>Cooldown</span>
        <div class="bar atk">
          <div class="fill" :style="{ width: run.cooldownProgress * 100 + '%' }" />
        </div>
      </div>

      <div v-if="run.runStatus !== 'setup' && run.runStatus !== 'active'" class="post-run-controls">
        <button @click="run.restart()">Restart</button>
        <button @click="run.edit()">Edit</button>
        <button v-if="run.runStatus === 'victorious'" @click="run.prestige()">Prestige</button>
      </div>
    </section>

    <section class="panel">
      <h2>Champion</h2>
      <div class="stat-row">
        <span>HP</span>
        <div class="bar">
          <div class="fill" :style="{ width: (run.championHp / run.championStats.hp) * 100 + '%' }" />
        </div>
        <span class="value">{{ formatNumber(run.championHp) }}/{{ formatNumber(run.championStats.hp) }}</span>
      </div>
      <div class="stat-row">
        <span>Damage</span>
        <span class="value">{{ formatNumber(run.championStats.damage) }}</span>
      </div>
      <div class="stat-row">
        <span>Attack Speed</span>
        <span class="value">{{ formatNumber(run.championStats.attackSpeed, 2) }}</span>
      </div>
      <div v-if="run.isFighting" class="stat-row">
        <span>Attack</span>
        <div class="bar atk">
          <div class="fill" :style="{ width: run.championAttackProgress * 100 + '%' }" />
        </div>
      </div>
      <div v-if="run.champion.traits.length > 0" class="traits">
        <span v-for="trait in run.champion.traits" :key="trait.stat"
          >{{ trait.stat }} +{{ formatNumber(trait.amount, 2) }}</span
        >
      </div>
    </section>

    <section v-if="run.currentEnemy && run.currentEnemyStats && run.currentEnemyRewards" class="panel enemy">
      <h2>Enemy</h2>
      <div class="stat-row">
        <span>HP</span>
        <div class="bar">
          <div class="fill" :style="{ width: (run.enemyHp / run.currentEnemyStats.hp) * 100 + '%' }" />
        </div>
        <span class="value">{{ formatNumber(run.enemyHp) }}/{{ formatNumber(run.currentEnemyStats.hp) }}</span>
      </div>
      <div class="stat-row">
        <span>Damage</span>
        <span class="value">{{ formatNumber(run.currentEnemyStats.damage) }}</span>
      </div>
      <div class="stat-row">
        <span>Attack Speed</span>
        <span class="value">{{ formatNumber(run.currentEnemyStats.attackSpeed, 2) }}</span>
      </div>
      <div v-if="run.isFighting" class="stat-row">
        <span>Attack</span>
        <div class="bar atk">
          <div class="fill" :style="{ width: run.enemyAttackProgress * 100 + '%' }" />
        </div>
      </div>
      <div v-if="run.currentEnemy.traits.length > 0" class="traits">
        <span v-for="trait in run.currentEnemy.traits" :key="trait.stat"
          >{{ trait.stat }} +{{ formatNumber(trait.amount, 2) }}</span
        >
      </div>
      <div class="traits">
        <span>exp +{{ formatNumber(run.currentEnemyRewards.experience) }}</span>
        <span>gold +{{ formatNumber(run.currentEnemyRewards.gold) }}</span>
      </div>
    </section>

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
      <h2>Champion Upgrades</h2>
      <ul class="upgrade-list">
        <li v-for="kind in CHAMPION_UPGRADE_KINDS" :key="kind" class="upgrade-row">
          <span>{{ championUpgradeLabels[kind] }} (Lv {{ progression.championUpgrades[kind] }})</span>
          <button
            :disabled="progression.experience < progression.championUpgradeCostOf(kind)"
            @click="progression.didPurchaseChampionUpgrade(kind)"
          >
            Upgrade ({{ formatNumber(progression.championUpgradeCostOf(kind)) }} exp)
          </button>
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Meta Unlocks</h2>
      <ul class="upgrade-list">
        <li v-for="unlock in progression.metaUnlocks" :key="unlock.id" class="upgrade-row">
          <span>{{ unlock.id }}</span>
          <span v-if="unlock.unlocked">Unlocked</span>
          <button v-else :disabled="progression.prestigeTokens < 1" @click="progression.didPurchaseMetaUnlock(unlock.id)">
            Unlock (1 token)
          </button>
        </li>
      </ul>
    </section>

    <button v-if="isDevelopment" @click="hardReset()">Dev: hard reset everything</button>
  </aside>
</template>

<style scoped>
.hud {
  width: 16rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  max-height: 100%;
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

.status {
  margin: 0 0 0.5rem;
}

.post-run-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
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

.cooldown .fill {
  background: var(--color-text);
  opacity: 0.5;
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

.upgrade-list {
  list-style: none;
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
</style>
