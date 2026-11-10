import { z } from 'zod'
import { TipKind, TipScope, Uuid, type MatchupScope, type Patch, type Tip } from '@/schema'
import { KIND_LABELS, ROLE_LABELS, describeScope, type ChampionNamer } from './labels'

/**
 * What the AI may propose after reading a review: new tips, changed tips,
 * tips to drop. Never rune pages or skill orders. Nothing here is stored;
 * every accepted line becomes an ordinary tip change through the store
 * (D-044). The format is the same for every provider.
 */

export const AiAddChange = z.strictObject({
  kind: z.literal('add'),
  scope: TipScope,
  tipKind: TipKind,
  text: z.string().trim().min(1),
  reason: z.string(),
})
export const AiUpdateChange = z.strictObject({
  kind: z.literal('update'),
  tipId: Uuid,
  text: z.string().trim().min(1),
  reason: z.string(),
})
export const AiRemoveChange = z.strictObject({
  kind: z.literal('remove'),
  tipId: Uuid,
  reason: z.string(),
})
export const AiChange = z.discriminatedUnion('kind', [AiAddChange, AiUpdateChange, AiRemoveChange])
export type AiChange = z.infer<typeof AiChange>

export const AiChangeSet = z.strictObject({ changes: z.array(AiChange) })
export type AiChangeSet = z.infer<typeof AiChangeSet>

/** JSON Schema for providers that can constrain their output to it. */
export const AI_CHANGE_SET_JSON_SCHEMA = z.toJSONSchema(AiChangeSet)

/** Everything the prompt is built from. */
export interface AiReviewContext {
  scope: MatchupScope
  reviewText: string
  /** The tips the AI may change: the ones in scope on the review page. */
  tips: readonly Tip[]
  patch: Patch
}

export interface AiPrompt {
  system: string
  user: string
}

const SYSTEM_PROMPT = `You help a League of Legends player keep a notebook of matchup tips. After a game the player writes a short review. You read it next to the tips that already exist for that matchup and propose changes to the tips.

What a tip is: one short, concrete thing to remember next time, in the player's own words where possible. One idea per tip. Kinds: setup (before the game: runes, items, starting plan), early (the laning phase), watch_out (a threat or trap), win_con (how the game is won), general (anything else).

Rules:
- Propose only what the review supports. When the review says nothing new, propose nothing.
- A new insight becomes an "add". Keep the player's wording when it is already clear.
- A review that contradicts or refines an existing tip becomes an "update" of that tip, with the full new text.
- A tip the player says no longer works, or that the review shows was wrong, becomes a "remove".
- Never repeat an existing tip as an add. Never add runes, item builds as a list, or skill orders.
- Scope: myChamp is always the player's champion. Set enemy only when the tip is about this one enemy; leave it out when it applies against anyone. Set role only when the tip is about this lane; leave it out otherwise.
- Every change carries a one-sentence reason that points at the review.
- Answer with JSON only, no prose, no code fences.`

/** The same prompt for every provider, so a copied answer and an API answer look alike. */
export function buildAiPrompt(context: AiReviewContext, nameOf: ChampionNamer): AiPrompt {
  const { scope, reviewText, tips, patch } = context
  const lines = [
    `Matchup: ${describeScope(scope, nameOf)}. Patch ${patch}.`,
    `Champion ids to use in scopes: myChamp "${scope.myChamp}"${scope.enemy ? `, enemy "${scope.enemy}"` : ''}${scope.role ? `. Lane: role "${scope.role}" (${ROLE_LABELS[scope.role]})` : ''}.`,
    '',
    'Review:',
    reviewText.trim(),
    '',
    tips.length === 0 ? 'There are no tips for this matchup yet.' : 'Current tips in scope:',
    ...tips.map(describeTip),
    '',
    'Propose the changes, as JSON with a "changes" array.',
  ]
  return { system: SYSTEM_PROMPT, user: lines.join('\n') }
}

function describeTip(tip: Tip): string {
  const scopeParts = [
    tip.scope.myChamp ? `myChamp ${tip.scope.myChamp}` : undefined,
    tip.scope.enemy ? `enemy ${tip.scope.enemy}` : undefined,
    tip.scope.role ? `role ${tip.scope.role}` : undefined,
  ].filter((part) => part !== undefined)
  return `- id ${tip.id} | ${KIND_LABELS[tip.kind]} | ${scopeParts.join(', ')} | ${tip.text}`
}

export type AiAnswerResult = { ok: true; set: AiChangeSet } | { ok: false; error: string }

/**
 * The provider's text to a change set. Code fences and chatter around the
 * JSON are tolerated; anything that does not fit the schema is an error
 * with a retry, never a half-applied answer.
 */
export function parseAiAnswer(text: string): AiAnswerResult {
  const json = extractJson(text)
  if (json === undefined) return { ok: false, error: 'The answer held no JSON.' }
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: 'The answer was not valid JSON.' }
  }
  const parsed = AiChangeSet.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: `The answer did not fit the expected shape. ${z.prettifyError(parsed.error)}`,
    }
  }
  return { ok: true, set: parsed.data }
}

function extractJson(text: string): string | undefined {
  const unfenced = text.replace(/```(?:json)?/gi, '')
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined
  return unfenced.slice(start, end + 1)
}

/**
 * Keeps the AI inside the matchup: unknown tip ids are dropped, and scopes
 * are clamped to the review's champion, enemy and lane. Returns what was
 * left out, for the review screen to mention.
 */
export function checkAiChanges(
  set: AiChangeSet,
  context: AiReviewContext,
): { changes: AiChange[]; dropped: number } {
  const knownIds = new Set(context.tips.map((tip) => tip.id))
  const changes: AiChange[] = []
  let dropped = 0
  for (const change of set.changes) {
    if (change.kind === 'add') {
      changes.push({ ...change, scope: clampScope(change.scope, context.scope) })
    } else if (knownIds.has(change.tipId)) {
      changes.push(change)
    } else {
      dropped++
    }
  }
  return { changes, dropped }
}

function clampScope(
  proposed: z.infer<typeof TipScope>,
  allowed: MatchupScope,
): z.infer<typeof TipScope> {
  return {
    myChamp: allowed.myChamp,
    ...(proposed.enemy !== undefined &&
      proposed.enemy === allowed.enemy && { enemy: allowed.enemy }),
    ...(proposed.role !== undefined && proposed.role === allowed.role && { role: allowed.role }),
  }
}

/** One line on the review screen: the change plus what the player decided. */
export interface AiDecision {
  change: AiChange
  accepted: boolean
  /** The text as edited on the review screen, for add and update. */
  text: string
}

export function decisionsFor(changes: readonly AiChange[]): AiDecision[] {
  return changes.map((change) => ({
    change,
    accepted: true,
    text: change.kind === 'remove' ? '' : change.text,
  }))
}

/** Short label for a change kind on the review screen. */
export const AI_CHANGE_LABELS: Readonly<Record<AiChange['kind'], string>> = {
  add: 'New tip',
  update: 'Change',
  remove: 'Remove',
}
