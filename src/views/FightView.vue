<script setup lang="ts">
import BracketCanvas from '@/components/BracketCanvas.vue'
import RunHud from '@/components/RunHud.vue'
</script>

<template>
  <main class="fight-layout">
    <div class="main-column">
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

@media (max-width: 640px) {
  .fight-layout {
    flex-direction: column;
    height: auto;
  }
}
</style>
