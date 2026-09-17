export function mergeExperience(winnerValue: number, loserValue: number): number {
  return winnerValue + loserValue
}

export function experienceReward(experienceValue: number, level: number): number {
  return experienceValue * (1 + level)
}
