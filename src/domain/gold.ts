export function mergeGold(winnerValue: number, loserValue: number): number {
  return winnerValue + loserValue
}

export function goldReward(goldValue: number, level: number): number {
  return goldValue * (1 + level)
}
