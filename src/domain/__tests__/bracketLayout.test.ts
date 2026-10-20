import { describe, it, expect } from 'vitest'
import { bracketNodePositions } from '../bracketLayout'

describe('bracketNodePositions', () => {
  it('spaces the first round evenly and advances x by the column gap', () => {
    const positions = bracketNodePositions([4, 2, 1], 200, 50)

    expect(positions[0]!.map((point) => point.y)).toEqual([0, 50, 100, 150])
    expect(positions.map((round) => round[0]!.x)).toEqual([0, 200, 400])
  })

  it('places each node at the midpoint of the two nodes feeding into it', () => {
    const positions = bracketNodePositions([8, 4, 2, 1], 200, 50)

    expect(positions[1]!.map((point) => point.y)).toEqual([25, 125, 225, 325])
    expect(positions[2]!.map((point) => point.y)).toEqual([75, 275])
    expect(positions[3]!.map((point) => point.y)).toEqual([175])
  })

  it.each([1, 2, 3, 4, 5])(
    'converges to a single node with every parent centered on its feeders for %i levels',
    (levels) => {
      const roundSizes = Array.from({ length: levels + 1 }, (_, round) => 2 ** (levels - round))

      const positions = bracketNodePositions(roundSizes, 200, 50)

      expect(positions.map((round) => round.length)).toEqual(roundSizes)
      expect(positions[levels]).toHaveLength(1)
      for (let round = 1; round <= levels; round++) {
        const column = positions[round]!
        for (const [position, node] of column.entries()) {
          const upper = positions[round - 1]![position * 2]!
          const lower = positions[round - 1]![position * 2 + 1]!
          expect(node.y).toBe((upper.y + lower.y) / 2)
          expect(node.x).toBe(upper.x + 200)
        }
      }
    },
  )
})
