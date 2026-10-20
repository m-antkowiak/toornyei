export type CanvasFrame = { kind: 'all' } | { kind: 'round'; round: number }

export interface CanvasFraming {
  frame: CanvasFrame
  overridden: boolean
}

export type CanvasFramingEvent =
  | { type: 'enteredSetup' }
  | { type: 'roundStarted'; round: number }
  | { type: 'userMoved' }
  | { type: 'recentered'; round: number }
  | { type: 'fitAll' }

export const initialFraming: CanvasFraming = { frame: { kind: 'all' }, overridden: false }

export function nextFraming(framing: CanvasFraming, event: CanvasFramingEvent): CanvasFraming {
  switch (event.type) {
    case 'enteredSetup': {
      return { frame: { kind: 'all' }, overridden: false }
    }
    case 'roundStarted': {
      if (framing.overridden) return framing
      return { frame: { kind: 'round', round: event.round }, overridden: false }
    }
    case 'userMoved': {
      return { ...framing, overridden: true }
    }
    case 'recentered': {
      return { frame: { kind: 'round', round: event.round }, overridden: false }
    }
    case 'fitAll': {
      return { ...framing, frame: { kind: 'all' } }
    }
  }
}
