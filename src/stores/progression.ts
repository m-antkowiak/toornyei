import { ref } from 'vue'
import { defineStore, acceptHMRUpdate } from 'pinia'

export const useProgressionStore = defineStore('progression', () => {
  const experience = ref(0)

  function grantExperience(amount: number) {
    experience.value += amount
  }

  return {
    experience,
    grantExperience,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProgressionStore, import.meta.hot))
}
