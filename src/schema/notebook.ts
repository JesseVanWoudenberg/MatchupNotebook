import { z } from 'zod'
import { ChampId, Uuid } from './primitives'
import { Tip } from './tip'
import { RunePage } from './runePage'
import { Review } from './review'
import { SkillOrder } from './skillOrder'

/**
 * Bump when the file shape changes, and add a migration from the previous
 * version in src/persistence/migrations.ts.
 *
 * History:
 * 1: profile, tips, runePages, reflections.
 * 2: favoriteChamps.
 * 3: reflections renamed to reviews, tip.reflectionId to reviewId.
 * 4: skillOrders.
 */
export const SCHEMA_VERSION = 4

/**
 * Local profile. authorId is generated on first launch and stamped on every
 * item you create. authorName stays empty until you share something.
 * No email, no real name, nothing else. Ask before adding a field.
 */
export const Profile = z.strictObject({
  authorId: Uuid,
  authorName: z.string(),
})
export type Profile = z.infer<typeof Profile>

function uniqueIds(items: { id: string }[], ctx: z.RefinementCtx, path: string) {
  const seen = new Set<string>()
  items.forEach((item, i) => {
    if (seen.has(item.id)) {
      ctx.addIssue({ code: 'custom', message: `Duplicate id ${item.id}`, path: [path, i, 'id'] })
    }
    seen.add(item.id)
  })
}

/**
 * The whole notebook file. One JSON document. Also the export format.
 * Tips are one flat list; a matchup card is only a view on top of it.
 */
export const Notebook = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    profile: Profile,
    /** Your champion pool, in the order you added them. Shown first in pickers. */
    favoriteChamps: z.array(ChampId),
    tips: z.array(Tip),
    runePages: z.array(RunePage),
    skillOrders: z.array(SkillOrder),
    reviews: z.array(Review),
  })
  .superRefine((notebook, ctx) => {
    uniqueIds(notebook.tips, ctx, 'tips')
    uniqueIds(notebook.runePages, ctx, 'runePages')
    uniqueIds(notebook.skillOrders, ctx, 'skillOrders')
    uniqueIds(notebook.reviews, ctx, 'reviews')
    if (new Set(notebook.favoriteChamps).size !== notebook.favoriteChamps.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate favorite', path: ['favoriteChamps'] })
    }
  })
export type Notebook = z.infer<typeof Notebook>

export type ValidationResult =
  { ok: true; notebook: Notebook } | { ok: false; error: string; issues: z.core.$ZodIssue[] }

/** Validate unknown JSON (already parsed) as a notebook. Never throws. */
export function validateNotebook(data: unknown): ValidationResult {
  const result = Notebook.safeParse(data)
  if (result.success) return { ok: true, notebook: result.data }
  return { ok: false, error: z.prettifyError(result.error), issues: result.error.issues }
}

/** Read the schemaVersion of an unknown document, if it has one. */
export function readSchemaVersion(data: unknown): number | undefined {
  if (typeof data !== 'object' || data === null) return undefined
  const version = (data as Record<string, unknown>)['schemaVersion']
  return typeof version === 'number' ? version : undefined
}
