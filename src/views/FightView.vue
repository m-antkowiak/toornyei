<script setup lang="ts">
import { useRunStore } from '@/stores/run'

const run = useRunStore()
</script>

<template>
  <main>
    <section>
      <h2>Champion</h2>
      <p>Attack Speed: {{ run.champion.attackSpeed }}</p>
      <p>Damage: {{ run.champion.damage }}</p>
      <p>HP: {{ run.championHp }} / {{ run.champion.hp }}</p>
    </section>

    <section>
      <h2>Enemy</h2>
      <p>Attack Speed: {{ run.currentEnemy.attackSpeed }}</p>
      <p>Damage: {{ run.currentEnemy.damage }}</p>
      <p>HP: {{ run.enemyHp }} / {{ run.currentEnemy.hp }}</p>
    </section>

    <button :disabled="run.isFighting" @click="run.commitToFight()">Commit to Fight</button>

    <p v-if="run.isFighting">Fighting...</p>
    <p v-else-if="run.outcome === 'champion'">Champion wins!</p>
    <p v-else-if="run.outcome === 'enemy'">Champion loses.</p>

    <section>
      <h2>Ladder</h2>
      <ol>
        <li
          v-for="(rung, index) in run.ladder"
          :key="index"
          :aria-current="index === run.rungIndex ? 'step' : undefined"
        >
          <span v-if="index < run.rungIndex">Cleared</span>
          <span v-else-if="index === run.rungIndex">Champion here</span>
          <span v-else>Locked</span>
          — Attack Speed: {{ rung.attackSpeed }}, Damage: {{ rung.damage }}, HP: {{ rung.hp }}
        </li>
      </ol>
    </section>
  </main>
</template>
