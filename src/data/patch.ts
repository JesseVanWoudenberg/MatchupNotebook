import { Patch } from '@/schema/primitives'

/**
 * Riot shows players a year-based patch like "26.20". Data Dragon publishes
 * "16.20.1". The majors differ by a fixed offset and the third segment is a
 * data revision players never see.
 *
 * ASSUMPTION: offset is 10 (ddragon 16.x is League patch 26.x). This is the
 * one place to fix if Riot's naming turns out different.
 */
export const DISPLAY_MAJOR_OFFSET = 10

/** Rough patches per year, used only to estimate distance across a year boundary. */
export const PATCHES_PER_YEAR_ESTIMATE = 24

const DDRAGON_VERSION = /^(\d+)\.(\d+)(?:\.(\d+))?$/

/** "16.20.1" -> "26.20". Throws on a version that does not look like Data Dragon's. */
export function displayPatchFromDataDragon(version: string): Patch {
  const match = DDRAGON_VERSION.exec(version.trim())
  if (!match) throw new Error(`Not a Data Dragon version: "${version}"`)
  const major = Number(match[1]) + DISPLAY_MAJOR_OFFSET
  const minor = Number(match[2])
  return Patch.parse(`${major}.${minor}`)
}

/** Split "26.20" into numbers. Returns undefined for anything else. */
export function parsePatch(patch: string): { major: number; minor: number } | undefined {
  const match = /^(\d+)\.(\d+)$/.exec(patch)
  if (!match) return undefined
  return { major: Number(match[1]), minor: Number(match[2]) }
}

/** Numeric ordering: negative if a is older than b, positive if newer, 0 if equal. */
export function comparePatches(a: Patch, b: Patch): number {
  const parsedA = parsePatch(a)
  const parsedB = parsePatch(b)
  if (!parsedA || !parsedB) return a.localeCompare(b)
  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major
  return parsedA.minor - parsedB.minor
}

/**
 * How many patches `tipPatch` is behind `current`. Exact when both are in
 * the known list (newest first, as versions.json gives it, converted to
 * display patches). Otherwise estimated from the numbers, which is exact
 * within a year and approximate across years. Undefined for junk.
 */
export function patchesBehind(
  current: Patch,
  tipPatch: Patch,
  knownNewestFirst: readonly Patch[] = [],
): number | undefined {
  const indexCurrent = knownNewestFirst.indexOf(current)
  const indexTip = knownNewestFirst.indexOf(tipPatch)
  if (indexCurrent >= 0 && indexTip >= 0) return indexTip - indexCurrent

  const parsedCurrent = parsePatch(current)
  const parsedTip = parsePatch(tipPatch)
  if (!parsedCurrent || !parsedTip) return undefined
  const years = parsedCurrent.major - parsedTip.major
  return years * PATCHES_PER_YEAR_ESTIMATE + (parsedCurrent.minor - parsedTip.minor)
}
