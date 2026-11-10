import { z } from 'zod'
import bundledSnapshot from './bundled/runes.json'

/**
 * Rune data as the app needs it. Styles (trees) and perks come from Data
 * Dragon's runesReforged.json. Stat shards are not in Data Dragon; their
 * rows are a League client constant, bundled here with icons from Community
 * Dragon.
 */
export const RunePerk = z.strictObject({
  id: z.int().positive(),
  key: z.string(),
  name: z.string().min(1),
  /** Path under Data Dragon's cdn/img/, like "perk-images/Styles/Sorcery/..." */
  icon: z.string().min(1),
})
export type RunePerk = z.infer<typeof RunePerk>

export const RuneStyle = z.strictObject({
  id: z.int().positive(),
  key: z.string(),
  name: z.string().min(1),
  icon: z.string().min(1),
  /** slots[0] holds the keystones, slots[1..3] the three rows below. */
  slots: z.array(z.array(RunePerk).min(1)).length(4),
})
export type RuneStyle = z.infer<typeof RuneStyle>

export const RuneSnapshot = z.strictObject({
  version: z.string().min(1),
  styles: z.array(RuneStyle).min(1),
})
export type RuneSnapshot = z.infer<typeof RuneSnapshot>

export interface StatShard {
  id: number
  name: string
}

/**
 * The three shard rows, top to bottom, as the League client lays them out.
 * Changes rarely; when Riot changes it this constant changes with the bundle.
 */
export const SHARD_ROWS: readonly (readonly StatShard[])[] = [
  [
    { id: 5008, name: 'Adaptive Force' },
    { id: 5005, name: 'Attack Speed' },
    { id: 5007, name: 'Ability Haste' },
  ],
  [
    { id: 5008, name: 'Adaptive Force' },
    { id: 5010, name: 'Move Speed' },
    { id: 5001, name: 'Health Scaling' },
  ],
  [
    { id: 5011, name: 'Health' },
    { id: 5013, name: 'Tenacity and Slow Resist' },
    { id: 5001, name: 'Health Scaling' },
  ],
]

export const SHARD_NAMES: Readonly<Record<number, string>> = Object.fromEntries(
  SHARD_ROWS.flat().map((shard) => [shard.id, shard.name]),
)

/** The snapshot shipped inside the app. Validated like any other input. */
export function loadBundledRunes(): RuneSnapshot {
  return RuneSnapshot.parse(bundledSnapshot)
}

export function bundledRuneIconUrl(perkId: number): string {
  return `/rune-icons/${perkId}.png`
}

export function bundledStyleIconUrl(styleId: number): string {
  return `/rune-icons/style-${styleId}.png`
}

export function shardIconUrl(shardId: number): string {
  return `/rune-icons/shard-${shardId}.png`
}

/** Data Dragon serves every rune image from one unversioned folder. */
export function remoteRuneIconUrl(iconPath: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/${iconPath}`
}

const RunesReforgedResponse = z.array(
  z.object({
    id: z.int(),
    key: z.string(),
    name: z.string(),
    icon: z.string(),
    slots: z.array(
      z.object({
        runes: z.array(
          z.object({ id: z.int(), key: z.string(), name: z.string(), icon: z.string() }),
        ),
      }),
    ),
  }),
)

export function runesUrl(version: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`
}

/** Data Dragon's runesReforged.json into our snapshot. Throws on an unexpected response. */
export function parseRunesReforged(json: string, version: string): RuneSnapshot {
  const response = RunesReforgedResponse.parse(JSON.parse(json))
  const styles = response
    .map((style) => ({
      id: style.id,
      key: style.key,
      name: style.name,
      icon: style.icon,
      slots: style.slots.map((slot) => slot.runes),
    }))
    .sort((a, b) => a.id - b.id)
  return RuneSnapshot.parse({ version, styles })
}
