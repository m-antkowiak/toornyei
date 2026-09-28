<script setup lang="ts">
import { useRunStore } from '@/stores/run'
import { useSetupStore } from '@/stores/setup'
import { ENEMY_CATALOG } from '@/domain/catalog'
import BracketCanvas from '@/components/BracketCanvas.vue'
import RunHud from '@/components/RunHud.vue'

const run = useRunStore()
const setup = useSetupStore()
</script>

<template>
  <main class="fight-layout">
    <div class="main-column">
      <section v-if="run.runStatus === 'setup'" class="setup-panel">
        <h2>Setup</h2>
        <ul class="upgrade-list">
          <li v-for="(typeId, slot) in setup.placement" :key="slot" class="upgrade-row">
            <span>Slot {{ slot + 2 }}</span>
            <select :value="typeId ?? ''" @change="setup.didPlaceType(slot, ($event.target as HTMLSelectElement).value)">
              <option value="" disabled>Choose an Enemy</option>
              <option v-for="type in ENEMY_CATALOG" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </li>
        </ul>
        <button :disabled="!setup.isComplete" @click="run.commitToFight()">Commit to Fight</button>
      </section>

      <BracketCanvas />
    </div>

    <RunHud />
  </main>
</template>

<style scoped>
.fight-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  height: calc(100vh - 8rem);
}

.main-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.setup-panel {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.9rem;
}

.setup-panel h2 {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-bottom: 0.6rem;
}

.upgrade-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.upgrade-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .fight-layout {
    flex-direction: column;
    height: auto;
  }
}
</style>
