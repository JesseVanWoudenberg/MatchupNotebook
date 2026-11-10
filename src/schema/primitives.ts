import { z } from 'zod'

/**
 * Riot's string champion ID, e.g. "MonkeyKing" for Wukong or "KSante".
 * Always alphanumeric in Data Dragon. Display names live in champ data,
 * never in the tips file.
 */
export const ChampId = z
  .string()
  .regex(/^[A-Za-z0-9]+$/, "Champ ID must be Riot's alphanumeric ID, like MonkeyKing")
export type ChampId = z.infer<typeof ChampId>

/** The lane you played. Shared by you and the enemy in a matchup. */
export const Role = z.enum(['top', 'jungle', 'mid', 'bot', 'support'])
export type Role = z.infer<typeof Role>
export const ROLES = Role.options

/**
 * Player-facing patch, as shown in the League client, e.g. "26.20".
 * Not the Data Dragon version ("16.20.1"). See src/data/patch.ts for the
 * conversion.
 */
export const Patch = z.string().regex(/^\d+\.\d+$/, 'Patch must look like "26.20"')
export type Patch = z.infer<typeof Patch>

export const Uuid = z.uuid()
export type Uuid = z.infer<typeof Uuid>

/** ISO 8601 timestamp in UTC, e.g. "2026-10-12T19:04:11.000Z". */
export const Timestamp = z.iso.datetime()
export type Timestamp = z.infer<typeof Timestamp>

/** Only "private" exists today. Cloud sharing adds values later. */
export const Visibility = z.enum(['private'])
export type Visibility = z.infer<typeof Visibility>

/**
 * Where an item came from. "mine" items show no badge. "imported" items
 * show the author's name. packId groups items that arrived in one import.
 */
export const Origin = z.strictObject({
  type: z.enum(['mine', 'imported']),
  authorId: Uuid,
  authorName: z.string(),
  packId: Uuid.optional(),
})
export type Origin = z.infer<typeof Origin>

/** Fields every stored item carries. Hidden in the UI, needed for sync later. */
export const ItemBase = z.strictObject({
  id: Uuid,
  origin: Origin,
  visibility: Visibility,
  createdAt: Timestamp,
  updatedAt: Timestamp,
})
