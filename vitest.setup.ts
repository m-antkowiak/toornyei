import { beforeEach } from 'vitest'

const entries = new Map<string, string>()

const memoryStorage: Storage = {
  get length() {
    return entries.size
  },
  clear: () => entries.clear(),
  getItem: (key) => entries.get(key) ?? null,
  key: (index) => [...entries.keys()][index] ?? null,
  removeItem: (key) => {
    entries.delete(key)
  },
  setItem: (key, value) => {
    entries.set(key, String(value))
  },
}

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
})

beforeEach(() => {
  memoryStorage.clear()
})
