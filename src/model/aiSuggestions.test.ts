import { describe, expect, it } from 'vitest'
import { makeTip } from '@/test/fixtures'
import {
  AI_CHANGE_SET_JSON_SCHEMA,
  buildAiPrompt,
  checkAiChanges,
  decisionsFor,
  parseAiAnswer,
  type AiReviewContext,
} from './aiSuggestions'

const nameOf = (id: string) => id
const TIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const context: AiReviewContext = {
  scope: { myChamp: 'Taliyah', enemy: 'Yasuo', role: 'mid' },
  reviewText: 'Lost early because I kept throwing Q into Wind Wall. Roaming worked.',
  tips: [makeTip({ id: TIP_ID, text: 'Hold W for his dash.' })],
  patch: '26.20',
}

describe('buildAiPrompt', () => {
  it('puts the matchup, the review and every tip with its id in the prompt', () => {
    const prompt = buildAiPrompt(context, nameOf)
    expect(prompt.system).toContain('JSON only')
    expect(prompt.user).toContain('Taliyah vs Yasuo, mid')
    expect(prompt.user).toContain('Patch 26.20')
    expect(prompt.user).toContain('throwing Q into Wind Wall')
    expect(prompt.user).toContain(
      `id ${TIP_ID} | Early game | myChamp Taliyah, enemy Yasuo | Hold W`,
    )
    expect(prompt.user).toContain('myChamp "Taliyah", enemy "Yasuo"')
  })

  it('says so when there are no tips yet', () => {
    expect(buildAiPrompt({ ...context, tips: [] }, nameOf).user).toContain(
      'no tips for this matchup yet',
    )
  })
})

describe('parseAiAnswer', () => {
  const answer = {
    changes: [
      {
        kind: 'add',
        scope: { myChamp: 'Taliyah', enemy: 'Yasuo' },
        tipKind: 'watch_out',
        text: 'Throw Q only after Wind Wall is down.',
        reason: 'The review says Q kept hitting Wind Wall.',
      },
      { kind: 'update', tipId: TIP_ID, text: 'Hold W for his third Q.', reason: 'Refined.' },
      { kind: 'remove', tipId: OTHER_ID, reason: 'No longer true.' },
    ],
  }

  it('accepts plain JSON, fenced JSON and JSON with chatter around it', () => {
    const json = JSON.stringify(answer)
    for (const text of [json, `\`\`\`json\n${json}\n\`\`\``, `Here you go:\n${json}\nDone.`]) {
      const result = parseAiAnswer(text)
      expect(result.ok).toBe(true)
      expect(result.ok ? result.set.changes : []).toHaveLength(3)
    }
  })

  it('rejects answers that are not the format, with a readable error', () => {
    expect(parseAiAnswer('Sure, I would suggest...')).toEqual({
      ok: false,
      error: 'The answer held no JSON.',
    })
    expect(parseAiAnswer('{ not json }')).toEqual({
      ok: false,
      error: 'The answer was not valid JSON.',
    })
    const wrong = parseAiAnswer(JSON.stringify({ changes: [{ kind: 'add', text: '' }] }))
    expect(wrong.ok).toBe(false)
    expect(wrong.ok ? '' : wrong.error).toContain('did not fit')
  })

  it('has a JSON schema with the changes array for providers that constrain output', () => {
    expect(JSON.stringify(AI_CHANGE_SET_JSON_SCHEMA)).toContain('"changes"')
  })

  it('drops changes to tips that are not in scope and clamps scopes to the matchup', () => {
    const parsed = parseAiAnswer(
      JSON.stringify({
        changes: [
          ...answer.changes,
          {
            kind: 'add',
            scope: { myChamp: 'Ahri', enemy: 'Zed', role: 'top' },
            tipKind: 'general',
            text: 'Wrong matchup.',
            reason: 'x',
          },
        ],
      }),
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const { changes, dropped } = checkAiChanges(parsed.set, context)
    expect(dropped).toBe(1)
    expect(changes.map((change) => change.kind)).toEqual(['add', 'update', 'add'])
    expect(changes[2]).toMatchObject({ scope: { myChamp: 'Taliyah' } })
    expect(changes[0]).toMatchObject({ scope: { myChamp: 'Taliyah', enemy: 'Yasuo' } })
  })

  it('starts every line accepted with its text ready to edit', () => {
    const parsed = parseAiAnswer(JSON.stringify(answer))
    if (!parsed.ok) throw new Error(parsed.error)
    const decisions = decisionsFor(parsed.set.changes)
    expect(decisions.every((decision) => decision.accepted)).toBe(true)
    expect(decisions[0]?.text).toBe('Throw Q only after Wind Wall is down.')
    expect(decisions[2]?.text).toBe('')
  })
})
