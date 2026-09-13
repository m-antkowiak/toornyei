<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRunStore } from '@/stores/run'
import PrototypeSwitcher from '@/components/PrototypeSwitcher.vue'
import BracketTreeVariant from './ladder-prototypes/BracketTreeVariant.vue'
import CollapsedRungsVariant from './ladder-prototypes/CollapsedRungsVariant.vue'
import SideRailVariant from './ladder-prototypes/SideRailVariant.vue'

const run = useRunStore()
const route = useRoute()

const LADDER_PROTOTYPE_VARIANTS = [
  { key: 'A', label: 'Bracket tree' },
  { key: 'B', label: 'Collapsed rungs' },
  { key: 'C', label: 'Side rail' },
]

const activeVariant = computed(() => (import.meta.env.DEV ? (route.query['variant'] as string | undefined) : undefined))
</script>

<template>
  <template v-if="activeVariant">
    <BracketTreeVariant v-if="activeVariant === 'A'" />
    <CollapsedRungsVariant v-else-if="activeVariant === 'B'" />
    <SideRailVariant v-else-if="activeVariant === 'C'" />
    <PrototypeSwitcher :variants="LADDER_PROTOTYPE_VARIANTS" />
  </template>
  <main v-else>
    <section>
      <h2>Champion</h2>
      <p>Attack Speed: {{ run.championStats.attackSpeed }}</p>
      <p>Damage: {{ run.championStats.damage }}</p>
      <p>HP: {{ run.championHp }} / {{ run.championStats.hp }}</p>
      <p v-if="run.champion.traits.length > 0">
        Traits:
        <span v-for="trait in run.champion.traits" :key="trait.stat">
          {{ trait.stat }} +{{ trait.amount }}
        </span>
      </p>
    </section>

    <section>
      <h2>Enemy</h2>
      <p>Attack Speed: {{ run.currentEnemyStats.attackSpeed }}</p>
      <p>Damage: {{ run.currentEnemyStats.damage }}</p>
      <p>HP: {{ run.enemyHp }} / {{ run.currentEnemyStats.hp }}</p>
    </section>

    <button :disabled="run.isFighting || run.runStatus !== 'active'" @click="run.commitToFight()">
      Commit to Fight
    </button>

    <p v-if="run.isFighting">Fighting...</p>
    <p v-else-if="run.runStatus === 'victorious'">Run over — you cleared the Ladder!</p>
    <p v-else-if="run.runStatus === 'defeated'">Run over — your Champion has fallen.</p>
    <p v-else-if="run.outcome === 'champion'">Champion wins!</p>
    <p v-else-if="run.outcome === 'enemy'">Champion loses.</p>

    <button v-if="run.runStatus !== 'active'" @click="run.reset()">Reset</button>

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
          — Attack Speed: {{ rung.baseStats.attackSpeed }}, Damage: {{ rung.baseStats.damage }},
          HP: {{ rung.baseStats.hp }}
        </li>
      </ol>
    </section>
  </main>
</template>
