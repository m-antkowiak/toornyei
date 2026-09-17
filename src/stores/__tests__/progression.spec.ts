import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProgressionStore } from '../progression'

describe('progression store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with zero experience', () => {
    const store = useProgressionStore()
    expect(store.experience).toBe(0)
  })

  it('accumulates experience granted across multiple calls', () => {
    const store = useProgressionStore()
    store.grantExperience(10)
    store.grantExperience(5)
    expect(store.experience).toBe(15)
  })
})
