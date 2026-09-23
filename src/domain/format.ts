const SHORT_SCALE_SUFFIXES = ['', 'K', 'M', 'B', 'T']
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const LETTER_TIER_COUNT = 10
const SCIENTIFIC_TIER = SHORT_SCALE_SUFFIXES.length + LETTER_TIER_COUNT

function letterSuffix(letterTier: number): string {
  const first = Math.floor(letterTier / LETTERS.length)
  const second = letterTier % LETTERS.length
  return LETTERS.charAt(first) + LETTERS.charAt(second)
}

function trimNumber(rounded: number, maxDecimals: number): string {
  if (Number.isInteger(rounded)) return rounded.toString()
  return rounded.toFixed(maxDecimals).replace(/0+$/, '').replace(/\.$/, '')
}

export function formatNumber(value: number, smallDecimals = 1): string {
  const sign = value < 0 ? '-' : ''
  const magnitude = Math.abs(value)

  if (magnitude < 1000) {
    const factor = 10 ** smallDecimals
    return sign + trimNumber(Math.round(magnitude * factor) / factor, smallDecimals)
  }

  const tier = Math.floor(Math.log10(magnitude) / 3)

  if (tier >= SCIENTIFIC_TIER) {
    const exponent = Math.floor(Math.log10(magnitude))
    const mantissa = magnitude / 10 ** exponent
    return `${sign}${trimNumber(Math.round(mantissa * 100) / 100, 2)}e${exponent}`
  }

  const scaled = magnitude / 1000 ** tier
  const suffix =
    tier < SHORT_SCALE_SUFFIXES.length
      ? SHORT_SCALE_SUFFIXES[tier]
      : letterSuffix(tier - SHORT_SCALE_SUFFIXES.length)

  return `${sign}${trimNumber(Math.round(scaled * 100) / 100, 2)}${suffix}`
}
