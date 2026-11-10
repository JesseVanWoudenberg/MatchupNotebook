import { describe, expect, it } from 'vitest'
import { parseNotebookDocument, serializeNotebook } from './document'
import { CorruptNotebookError, UnsupportedSchemaVersionError } from './errors'
import { SCHEMA_VERSION } from '@/schema'
import { makeNotebook, makeTip } from '@/test/fixtures'

describe('serializeNotebook and parseNotebookDocument', () => {
  it('round-trips a notebook', () => {
    const notebook = makeNotebook({ tips: [makeTip()] })
    expect(parseNotebookDocument(serializeNotebook(notebook))).toEqual(notebook)
  })
  it('writes indented JSON with a trailing newline', () => {
    const text = serializeNotebook(makeNotebook())
    expect(text.endsWith('\n')).toBe(true)
    expect(text).toContain(`
  "schemaVersion": ${SCHEMA_VERSION},
`)
  })
  it('rejects text that is not JSON', () => {
    expect(() => parseNotebookDocument('{ not json')).toThrow(CorruptNotebookError)
  })
  it('rejects JSON without a schemaVersion', () => {
    expect(() => parseNotebookDocument('{"tips": []}')).toThrow(CorruptNotebookError)
  })
  it('rejects a file from a newer app', () => {
    const text = JSON.stringify({ ...makeNotebook(), schemaVersion: 99 })
    expect(() => parseNotebookDocument(text)).toThrow(UnsupportedSchemaVersionError)
  })
  it('rejects a document that fails validation, with the detail in the message', () => {
    const text = JSON.stringify(makeNotebook({ tips: [makeTip({ text: '' })] }))
    expect(() => parseNotebookDocument(text)).toThrow(/tips/)
  })
})
