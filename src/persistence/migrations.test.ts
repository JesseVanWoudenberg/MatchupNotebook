import { describe, expect, it } from 'vitest'
import { CorruptNotebookError } from './errors'
import { MIGRATIONS, migrateNotebook, type Migration } from './migrations'
import { parseNotebookDocument } from './document'
import { AUTHOR_ID, T0, makeTip, profile } from '@/test/fixtures'

describe('migrateNotebook', () => {
  const addField =
    (field: string, version: number): Migration =>
    (raw) => ({ ...(raw as Record<string, unknown>), [field]: true, schemaVersion: version })

  it('returns the document untouched when it is already current', () => {
    const raw = { schemaVersion: 1 }
    expect(migrateNotebook(raw, 1, {}, 1)).toBe(raw)
  })
  it('chains migrations in order', () => {
    const migrations = { 1: addField('fromOne', 2), 2: addField('fromTwo', 3) }
    expect(migrateNotebook({ schemaVersion: 1 }, 1, migrations, 3)).toEqual({
      schemaVersion: 3,
      fromOne: true,
      fromTwo: true,
    })
  })
  it('throws when a step is missing', () => {
    const migrations = { 1: addField('fromOne', 2) }
    expect(() => migrateNotebook({ schemaVersion: 1 }, 1, migrations, 3)).toThrow(
      CorruptNotebookError,
    )
  })
})

describe('real migrations', () => {
  const reflection = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
    text: 'Old write-up.',
    patch: '26.20',
    origin: { type: 'mine', authorId: AUTHOR_ID, authorName: '' },
    visibility: 'private',
    createdAt: T0,
    updatedAt: T0,
  }
  const tipV1 = { ...makeTip(), reflectionId: reflection.id }

  it('bring a version 1 file up to date', () => {
    const versionOne = {
      schemaVersion: 1,
      profile,
      tips: [tipV1],
      runePages: [],
      reflections: [reflection],
    }

    const notebook = parseNotebookDocument(JSON.stringify(versionOne))
    expect(notebook.schemaVersion).toBe(4)
    expect(notebook.favoriteChamps).toEqual([])
    expect(notebook.skillOrders).toEqual([])
    expect(notebook.reviews).toEqual([reflection])
    expect(notebook.tips[0]?.reviewId).toBe(reflection.id)
    expect('reflectionId' in notebook.tips[0]!).toBe(false)
  })
  it('bring a version 2 file up to date', () => {
    const versionTwo = {
      schemaVersion: 2,
      profile,
      favoriteChamps: ['Taliyah'],
      tips: [makeTip()],
      runePages: [],
      reflections: [],
    }
    const notebook = parseNotebookDocument(JSON.stringify(versionTwo))
    expect(notebook.schemaVersion).toBe(4)
    expect(notebook.favoriteChamps).toEqual(['Taliyah'])
    expect(notebook.reviews).toEqual([])
    expect(notebook.tips[0]).toEqual(makeTip())
  })
  it('refuse a version 1 document that is not an object', () => {
    expect(() => MIGRATIONS[1]!('nope')).toThrow(CorruptNotebookError)
  })
})
