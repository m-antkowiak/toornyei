export function pairUpcomingCombatants(count: number, currentIndex: number): Array<[number, number]> {
  const upcoming: number[] = []
  for (let index = currentIndex + 1; index < count; index++) {
    upcoming.push(index)
  }

  const pairs: Array<[number, number]> = []
  for (let index = 0; index + 1 < upcoming.length; index += 2) {
    pairs.push([upcoming[index]!, upcoming[index + 1]!])
  }
  return pairs
}
