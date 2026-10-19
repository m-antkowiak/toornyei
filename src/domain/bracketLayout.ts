export interface BracketPoint {
  x: number
  y: number
}

export function bracketNodePositions(roundSizes: number[], columnGap: number, rowHeight: number): BracketPoint[][] {
  const rounds: BracketPoint[][] = []
  for (const [round, size] of roundSizes.entries()) {
    const previous = rounds[round - 1]
    rounds.push(
      Array.from({ length: size }, (_, position) => ({
        x: round * columnGap,
        y: previous ? (previous[position * 2]!.y + previous[position * 2 + 1]!.y) / 2 : position * rowHeight,
      })),
    )
  }
  return rounds
}
