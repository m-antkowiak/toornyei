<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps<{
  variants: { key: string; label: string }[]
}>()

const isDev = import.meta.env.DEV

const route = useRoute()
const router = useRouter()

const currentIndex = computed(() => {
  const index = props.variants.findIndex((v) => v.key === route.query['variant'])
  return index === -1 ? 0 : index
})

function go(delta: number) {
  const next = (currentIndex.value + delta + props.variants.length) % props.variants.length
  router.replace({ query: { ...route.query, variant: props.variants[next]!.key } })
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
  if (event.key === 'ArrowLeft') go(-1)
  if (event.key === 'ArrowRight') go(1)
}

window.addEventListener('keydown', onKeydown)
</script>

<template>
  <div v-if="isDev" class="prototype-switcher">
    <button type="button" @click="go(-1)">←</button>
    <span>PROTOTYPE — {{ variants[currentIndex]?.key }} ({{ variants[currentIndex]?.label }})</span>
    <button type="button" @click="go(1)">→</button>
  </div>
</template>

<style scoped>
.prototype-switcher {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #111;
  color: #fff;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  font-size: 13px;
  font-family: ui-monospace, monospace;
  z-index: 9999;
}

.prototype-switcher button {
  background: #333;
  color: #fff;
  border: none;
  border-radius: 999px;
  width: 1.75rem;
  height: 1.75rem;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.prototype-switcher button:hover {
  background: #555;
}
</style>
