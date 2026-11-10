import { beforeEach, describe, expect, it } from 'vitest'
import { CorruptNotebookError } from './errors'
import { FileNotebookStore } from './fileNotebookStore'
import { serializeNotebook } from './document'
import { FakeAppFs } from '@/test/fakeAppFs'
import { makeNotebook, makeTip } from '@/test/fixtures'

const DIRECTORY = 'C:/fake/appdata'

describe('FileNotebookStore', () => {
  let fs: FakeAppFs
  let store: FileNotebookStore

  beforeEach(() => {
    fs = new FakeAppFs()
    store = new FileNotebookStore(fs, DIRECTORY, { backupCount: 2 })
  })

  it('loads undefined when the file does not exist', async () => {
    expect(await store.load()).toBeUndefined()
  })

  it('saves to notebook.json and loads it back', async () => {
    const notebook = makeNotebook({ tips: [makeTip()] })
    await store.save(notebook)
    expect(fs.paths()).toEqual([`${DIRECTORY}/notebook.json`])
    expect(await store.load()).toEqual(notebook)
  })

  it('leaves no temp file behind', async () => {
    await store.save(makeNotebook())
    expect(fs.paths().some((path) => path.endsWith('.tmp'))).toBe(false)
  })

  it('keeps the old file when writing the new one fails', async () => {
    const first = makeNotebook()
    await store.save(first)
    fs.failNextWrite = true
    await expect(store.save(makeNotebook({ tips: [makeTip()] }))).rejects.toThrow(/Disk full/)
    expect(await store.load()).toEqual(first)
  })

  it('makes no backup on the first save', async () => {
    await store.save(makeNotebook())
    expect(await store.listBackups()).toEqual([])
  })

  it('rotates backups, newest first, and drops the oldest past the limit', async () => {
    const versions = [0, 1, 2, 3].map((n) =>
      makeNotebook({ tips: [makeTip({ text: `version ${n}` })] }),
    )
    for (const version of versions) await store.save(version)

    expect(await store.listBackups()).toEqual([
      `${DIRECTORY}/notebook.backup-1.json`,
      `${DIRECTORY}/notebook.backup-2.json`,
    ])
    expect(fs.textOf(store.path)).toBe(serializeNotebook(versions[3]!))
    expect(fs.textOf(store.backupPath(1))).toBe(serializeNotebook(versions[2]!))
    expect(fs.textOf(store.backupPath(2))).toBe(serializeNotebook(versions[1]!))
    expect(fs.files.has(store.backupPath(3))).toBe(false)
  })

  it('throws on a corrupt file and does not touch it', async () => {
    fs.files.set(store.path, '{ broken')
    await expect(store.load()).rejects.toBeInstanceOf(CorruptNotebookError)
    expect(fs.textOf(store.path)).toBe('{ broken')
  })

  it('can run without backups', async () => {
    const noBackups = new FileNotebookStore(fs, DIRECTORY, { backupCount: 0 })
    await noBackups.save(makeNotebook())
    await noBackups.save(makeNotebook({ tips: [makeTip()] }))
    expect(fs.paths()).toEqual([`${DIRECTORY}/notebook.json`])
  })
})
