import type { ChampionUpgradeKind } from './championUpgrade'
import type { CombatantStats, FightTally } from './fight'

export type ActionSource = keyof FightTally

interface PassiveGrowthRules {
  source: ActionSource | undefined
  unlockCost: number
  baseCost: number
  costGrowth: number
  stepPerLevel: number
  expPerAction: number
}

export const PASSIVE_GROWTH_RULES: Record<ChampionUpgradeKind, PassiveGrowthRules> = {
  damage: {
    source: 'damageDealt',
    unlockCost: 50,
    baseCost: 100,
    costGrowth: 1.5,
    stepPerLevel: 0.05,
    expPerAction: 0.1,
  },
  attackSpeed: {
    source: undefined,
    unlockCost: 0,
    baseCost: 0,
    costGrowth: 1,
    stepPerLevel: 0,
    expPerAction: 0,
  },
  hp: {
    source: 'damageTaken',
    unlockCost: 50,
    baseCost: 100,
    costGrowth: 1.5,
    stepPerLevel: 0.05,
    expPerAction: 0.1,
  },
  regen: {
    source: 'hpRegenerated',
    unlockCost: 50,
    baseCost: 20,
    costGrowth: 1.5,
    stepPerLevel: 0.05,
    expPerAction: 0.5,
  },
}

export interface PassiveStatState {
  unlocked: boolean
  exp: number
  level: number
}

export type PassiveGrowthState = Record<ChampionUpgradeKind, PassiveStatState>

const PASSIVE_KINDS = Object.keys(PASSIVE_GROWTH_RULES) as ChampionUpgradeKind[]

export function createPassiveGrowthState(): PassiveGrowthState {
  return {
    damage: { unlocked: false, exp: 0, level: 0 },
    attackSpeed: { unlocked: false, exp: 0, level: 0 },
    hp: { unlocked: false, exp: 0, level: 0 },
    regen: { unlocked: false, exp: 0, level: 0 },
  }
}

export function hasPassiveSource(kind: ChampionUpgradeKind): boolean {
  return PASSIVE_GROWTH_RULES[kind].source !== undefined
}

export function passiveLevelCost(kind: ChampionUpgradeKind, level: number): number {
  const rules = PASSIVE_GROWTH_RULES[kind]
  return Math.round(rules.baseCost * rules.costGrowth ** level)
}

export function passiveMultiplier(kind: ChampionUpgradeKind, level: number): number {
  return 1 + PASSIVE_GROWTH_RULES[kind].stepPerLevel * level
}

function convertExpToLevels(kind: ChampionUpgradeKind, stat: PassiveStatState) {
  while (stat.exp >= passiveLevelCost(kind, stat.level)) {
    stat.exp -= passiveLevelCost(kind, stat.level)
    stat.level += 1
  }
}

export function accumulatePassiveExp(state: PassiveGrowthState, tally: FightTally) {
  for (const kind of PASSIVE_KINDS) {
    const { source, expPerAction } = PASSIVE_GROWTH_RULES[kind]
    const stat = state[kind]
    if (!source || !stat.unlocked) continue

    stat.exp += tally[source] * expPerAction
    convertExpToLevels(kind, stat)
  }
}

export function applyPassiveGrowth(
  stats: CombatantStats,
  state: PassiveGrowthState,
): CombatantStats {
  return {
    attackSpeed: stats.attackSpeed * passiveMultiplier('attackSpeed', state.attackSpeed.level),
    damage: stats.damage * passiveMultiplier('damage', state.damage.level),
    hp: stats.hp * passiveMultiplier('hp', state.hp.level),
    regen: stats.regen * passiveMultiplier('regen', state.regen.level),
  }
}
