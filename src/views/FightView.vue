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
      <p>Attack Speed: {{ run.enemy.attackSpeed }}</p>
      <p>Damage: {{ run.enemy.damage }}</p>
      <p>HP: {{ run.enemyHp }} / {{ run.enemy.hp }}</p>
    </section>

    <button :disabled="run.isFighting" @click="run.commitToFight()">Commit to Fight</button>

    <p v-if="run.isFighting">Fighting...</p>
    <p v-else-if="run.outcome === 'champion'">Champion wins!</p>
    <p v-else-if="run.outcome === 'enemy'">Champion loses.</p>
  </main>
</template>
