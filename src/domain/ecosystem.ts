import type { CombatantStats, FightOutcome } from './fight'
import { mergeTraitSets, type Trait } from './trait'
import { mergeExperience } from './experience'
import { mergeGold } from './gold'

export interface BracketCombatant {
  baseStats: CombatantStats
  traits: Trait[]
  experienceValue: number
  goldValue: number
}

export interface BracketMatch {
  round: number
  index: number
  first: number
  second: number
}

export interface Bracket {
  combatants: BracketCombatant[]
  rounds: Array<Array<number | undefined>>
}

export const CHAMPION_SLOT = 0

export function bracketSize(levels: number): number {
  return 2 ** levels
}

function isPowerOfTwo(count: number): boolean {
  return count >= 2 && (count & (count - 1)) === 0
}

export function createBracket(combatants: BracketCombatant[]): Bracket {
  if (!isPowerOfTwo(combatants.length)) {
    throw new Error(`A bracket needs a power-of-two number of combatants, got ${combatants.length}`)
  }

  const rounds: Bracket['rounds'] = [combatants.map((_, slot) => slot)]
  for (let size = combatants.length / 2; size >= 1; size /= 2) {
    rounds.push(Array.from<number | undefined>({ length: size }))
  }
  return { combatants, rounds }
}

function matchAt(bracket: Bracket, round: number, index: number): BracketMatch | undefined {
  const entrants = bracket.rounds[round]
  const advanced = bracket.rounds[round + 1]
  if (!entrants || !advanced) return undefined

  const first = entrants[index * 2]
  const second = entrants[index * 2 + 1]
  if (first === undefined || second === undefined) return undefined
  if (advanced[index] !== undefined) return undefined

  return { round, index, first, second }
}

export function liveMatches(bracket: Bracket): BracketMatch[] {
  const matches: BracketMatch[] = []
  for (let round = 0; round < bracket.rounds.length - 1; round++) {
    const matchCount = bracket.rounds[round]!.length / 2
    for (let index = 0; index < matchCount; index++) {
      const match = matchAt(bracket, round, index)
      if (match) matches.push(match)
    }
  }
  return matches
}

export function didResolveMatch(
  bracket: Bracket,
  round: number,
  index: number,
  outcome: FightOutcome,
): boolean {
  const match = matchAt(bracket, round, index)
  if (!match) return false

  const winnerSlot = outcome === 'champion' ? match.first : match.second
  const loserSlot = outcome === 'champion' ? match.second : match.first
  const winner = bracket.combatants[winnerSlot]!
  const loser = bracket.combatants[loserSlot]!

  winner.traits = mergeTraitSets(winner.traits, loser.traits)
  loser.traits = []
  winner.experienceValue = mergeExperience(winner.experienceValue, loser.experienceValue)
  loser.experienceValue = 0
  winner.goldValue = mergeGold(winner.goldValue, loser.goldValue)
  loser.goldValue = 0

  bracket.rounds[round + 1]![index] = winnerSlot
  return true
}

export function roundSurvivors(bracket: Bracket, round: number): number[] {
  const entrants = bracket.rounds[round] ?? []
  return entrants.filter((slot): slot is number => slot !== undefined)
}

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
