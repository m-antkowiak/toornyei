import { describe, it, expect } from 'vitest'
import { initialFraming, nextFraming } from '../canvasFraming'

describe('nextFraming', () => {
  it('frames the whole bracket when entering setup', () => {
    const framing = nextFraming(initialFraming, { type: 'enteredSetup' })

    expect(framing).toEqual({ frame: { kind: 'all' }, overridden: false })
  })

  it('frames the active round column when a round starts without an override', () => {
    const framing = nextFraming(initialFraming, { type: 'roundStarted', round: 2 })

    expect(framing).toEqual({ frame: { kind: 'round', round: 2 }, overridden: false })
  })

  it('records a manual pan or zoom as an override without changing the frame', () => {
    const before = nextFraming(initialFraming, { type: 'roundStarted', round: 1 })

    const framing = nextFraming(before, { type: 'userMoved' })

    expect(framing).toEqual({ frame: { kind: 'round', round: 1 }, overridden: true })
  })

  it('keeps the view across later round transitions while overridden', () => {
    const moved = nextFraming(nextFraming(initialFraming, { type: 'roundStarted', round: 1 }), { type: 'userMoved' })

    const framing = nextFraming(moved, { type: 'roundStarted', round: 2 })

    expect(framing).toEqual(moved)
  })

  it('reframes the active round column and clears the override on recenter', () => {
    const moved = nextFraming(initialFraming, { type: 'userMoved' })

    const framing = nextFraming(moved, { type: 'recentered', round: 3 })

    expect(framing).toEqual({ frame: { kind: 'round', round: 3 }, overridden: false })
  })

  it('fits everything on fit all while leaving an existing override in place', () => {
    const moved = nextFraming(initialFraming, { type: 'userMoved' })

    const framing = nextFraming(moved, { type: 'fitAll' })

    expect(framing).toEqual({ frame: { kind: 'all' }, overridden: true })
  })

  it('still auto-frames the next round after fit all when there was no override', () => {
    const fitted = nextFraming(nextFraming(initialFraming, { type: 'roundStarted', round: 1 }), { type: 'fitAll' })

    const framing = nextFraming(fitted, { type: 'roundStarted', round: 2 })

    expect(framing).toEqual({ frame: { kind: 'round', round: 2 }, overridden: false })
  })

  it('treats recenter after fit all the same as it would have been before', () => {
    const moved = nextFraming(initialFraming, { type: 'userMoved' })
    const fitted = nextFraming(moved, { type: 'fitAll' })

    expect(nextFraming(fitted, { type: 'recentered', round: 1 })).toEqual(
      nextFraming(moved, { type: 'recentered', round: 1 }),
    )
  })
})
