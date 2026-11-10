import { SCHEMA_VERSION } from '@/schema'
import { CorruptNotebookError } from './errors'

/** Takes a raw document at version N and returns it at version N + 1. */
export type Migration = (raw: unknown) => unknown

function asRecord(raw: unknown, fromVersion: number): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new CorruptNotebookError(`Schema version ${fromVersion} document is not an object.`)
  }
  return raw as Record<string, unknown>
}

/** 1 -> 2: favoriteChamps added, empty by default. */
const addFavoriteChamps: Migration = (raw) => ({
  ...asRecord(raw, 1),
  favoriteChamps: [],
  schemaVersion: 2,
})

/** 2 -> 3: "reflections" became "reviews", on the notebook and on tip links. */
const renameReflectionsToReviews: Migration = (raw) => {
  const { reflections, tips, ...rest } = asRecord(raw, 2)
  const renamedTips = Array.isArray(tips)
    ? tips.map((tip: unknown) => {
        if (typeof tip !== 'object' || tip === null) return tip
        const { reflectionId, ...tipRest } = tip as Record<string, unknown>
        return reflectionId === undefined ? tipRest : { ...tipRest, reviewId: reflectionId }
      })
    : tips
  return { ...rest, tips: renamedTips, reviews: reflections ?? [], schemaVersion: 3 }
}

/** 3 -> 4: skillOrders added, empty by default. */
const addSkillOrders: Migration = (raw) => ({
  ...asRecord(raw, 3),
  skillOrders: [],
  schemaVersion: 4,
})

/**
 * Keyed by the version a migration starts from. Adding a schema version means
 * bumping SCHEMA_VERSION and adding an entry here for the previous version.
 * Migrations work on untyped JSON because the old shape no longer has a type.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: addFavoriteChamps,
  2: renameReflectionsToReviews,
  3: addSkillOrders,
}

/** Run every migration from `fromVersion` up to the current schema version. */
export function migrateNotebook(
  raw: unknown,
  fromVersion: number,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  targetVersion: number = SCHEMA_VERSION,
): unknown {
  let current = raw
  for (let version = fromVersion; version < targetVersion; version++) {
    const migration = migrations[version]
    if (!migration) {
      throw new CorruptNotebookError(`No migration exists from schema version ${version}.`)
    }
    current = migration(current)
  }
  return current
}
