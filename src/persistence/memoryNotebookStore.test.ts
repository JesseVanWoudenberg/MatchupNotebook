import { describe, expect, it } from 'vitest'
import { CorruptNotebookError } from './errors'
import { MemoryNotebookStore } from './memoryNotebookStore'
import { makeNotebook, makeTip } from '@/test/fixtures'

describe('MemoryNotebookStore', () => {
  it('loads undefined when empty', async () => {
    expect(await new MemoryNotebookStore().load()).toBeUndefined()
  })
  it('saves and loads a notebook', async () => {
    const store = new MemoryNotebookStore()
    const notebook = makeNotebook({ tips: [makeTip()] })
    await store.save(notebook)
    expect(await store.load()).toEqual(notebook)
  })
  it('throws on corrupt stored text instead of returning something', async () => {
    const store = new MemoryNotebookStore('nope')
    await expect(store.load()).rejects.toBeInstanceOf(CorruptNotebookError)
  })
})
